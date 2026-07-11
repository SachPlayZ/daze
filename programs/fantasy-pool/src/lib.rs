use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use anchor_lang::solana_program::hash::hashv;

// Development placeholder. Replace with the deployed fantasy-pool program ID,
// never the TxLINE subscription program ID, before generating clients.
declare_id!("CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk");

#[program]
pub mod fantasy_pool {
    use super::*;

    pub fn create_contest(
        ctx: Context<CreateContest>,
        fixture_id_hash: [u8; 32],
        stake_tier: u64,
        stake_amount: u64,
        lock_ts: i64,
    ) -> Result<()> {
        require_token_2022(&ctx.accounts.token_program)?;
        require!(stake_amount > 0, FantasyPoolError::InvalidStake);
        require!(lock_ts > Clock::get()?.unix_timestamp, FantasyPoolError::ContestLocked);
        let contest = &mut ctx.accounts.contest;
        contest.authority = ctx.accounts.authority.key();
        contest.fixture_id_hash = fixture_id_hash;
        contest.stake_tier = stake_tier;
        contest.mint = ctx.accounts.mint.key();
        contest.stake_amount = stake_amount;
        contest.lock_ts = lock_ts;
        contest.vault = ctx.accounts.vault.key();
        contest.settlement_root = [0; 32];
        contest.finalized = false;
        contest.cancelled = false;
        contest.bump = ctx.bumps.contest;
        Ok(())
    }

    pub fn enter_contest(ctx: Context<EnterContest>, team_hash: [u8; 32]) -> Result<()> {
        require_token_2022(&ctx.accounts.token_program)?;
        let contest = &ctx.accounts.contest;
        require!(!contest.cancelled && !contest.finalized, FantasyPoolError::ContestUnavailable);
        require!(Clock::get()?.unix_timestamp < contest.lock_ts, FantasyPoolError::ContestLocked);
        require_keys_eq!(ctx.accounts.mint.key(), contest.mint, FantasyPoolError::InvalidStake);
        require_keys_eq!(ctx.accounts.vault.key(), contest.vault, FantasyPoolError::InvalidVault);
        require!(ctx.accounts.wallet_token.amount >= contest.stake_amount, FantasyPoolError::InvalidStake);

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.wallet_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.wallet.to_account_info(),
                },
            ),
            contest.stake_amount,
            ctx.accounts.mint.decimals,
        )?;

        let entry = &mut ctx.accounts.entry;
        entry.contest = contest.key();
        entry.wallet = ctx.accounts.wallet.key();
        entry.team_hash = team_hash;
        entry.claimed = false;
        entry.refunded = false;
        entry.bump = ctx.bumps.entry;
        Ok(())
    }

    pub fn publish_settlement(ctx: Context<PublishSettlement>, root: [u8; 32], payout_total: u64) -> Result<()> {
        require_token_2022(&ctx.accounts.token_program)?;
        let contest = &mut ctx.accounts.contest;
        require_keys_eq!(ctx.accounts.authority.key(), contest.authority, FantasyPoolError::Unauthorized);
        require!(Clock::get()?.unix_timestamp >= contest.lock_ts, FantasyPoolError::SettlementBeforeLock);
        require!(!contest.cancelled && !contest.finalized, FantasyPoolError::ContestUnavailable);
        require!(payout_total <= ctx.accounts.vault.amount, FantasyPoolError::InvalidSettlement);
        contest.settlement_root = root;
        contest.finalized = true;
        let settlement = &mut ctx.accounts.settlement;
        settlement.contest = contest.key();
        settlement.payout_total = payout_total;
        settlement.claimed_total = 0;
        settlement.root = root;
        settlement.published_at = Clock::get()?.unix_timestamp;
        settlement.bump = ctx.bumps.settlement;
        Ok(())
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        require_token_2022(&ctx.accounts.token_program)?;
        let contest = &ctx.accounts.contest;
        require!(contest.finalized && !contest.cancelled, FantasyPoolError::ContestUnavailable);
        require!(!ctx.accounts.entry.claimed && !ctx.accounts.entry.refunded, FantasyPoolError::AlreadyClaimed);
        require!(verify_merkle(leaf(ctx.accounts.entry.key(), amount), &proof, ctx.accounts.settlement.root), FantasyPoolError::InvalidProof);
        let next_claimed = ctx.accounts.settlement.claimed_total.checked_add(amount).ok_or(FantasyPoolError::InvalidSettlement)?;
        require!(next_claimed <= ctx.accounts.settlement.payout_total, FantasyPoolError::InvalidSettlement);
        let tier = contest.stake_tier.to_le_bytes();
        let signer_seeds: &[&[u8]] = &[b"contest", contest.fixture_id_hash.as_ref(), tier.as_ref(), &[contest.bump]];
        transfer_checked(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked {
                from: ctx.accounts.vault.to_account_info(), mint: ctx.accounts.mint.to_account_info(), to: ctx.accounts.wallet_token.to_account_info(), authority: ctx.accounts.contest.to_account_info(),
            }, &[signer_seeds]), amount, ctx.accounts.mint.decimals,
        )?;
        ctx.accounts.entry.claimed = true;
        ctx.accounts.settlement.claimed_total = next_claimed;
        Ok(())
    }

    pub fn cancel_contest(ctx: Context<CancelContest>) -> Result<()> {
        let contest = &mut ctx.accounts.contest;
        require_keys_eq!(ctx.accounts.authority.key(), contest.authority, FantasyPoolError::Unauthorized);
        require!(!contest.finalized && !contest.cancelled, FantasyPoolError::ContestUnavailable);
        contest.cancelled = true;
        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        require_token_2022(&ctx.accounts.token_program)?;
        let contest = &ctx.accounts.contest;
        require!(contest.cancelled && !contest.finalized, FantasyPoolError::ContestUnavailable);
        require!(!ctx.accounts.entry.claimed && !ctx.accounts.entry.refunded, FantasyPoolError::AlreadyClaimed);
        let tier = contest.stake_tier.to_le_bytes();
        let signer_seeds: &[&[u8]] = &[b"contest", contest.fixture_id_hash.as_ref(), tier.as_ref(), &[contest.bump]];
        transfer_checked(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked {
                from: ctx.accounts.vault.to_account_info(), mint: ctx.accounts.mint.to_account_info(), to: ctx.accounts.wallet_token.to_account_info(), authority: ctx.accounts.contest.to_account_info(),
            }, &[signer_seeds]), contest.stake_amount, ctx.accounts.mint.decimals,
        )?;
        ctx.accounts.entry.refunded = true;
        Ok(())
    }
}

fn leaf(entry: Pubkey, amount: u64) -> [u8; 32] { hashv(&[entry.as_ref(), &amount.to_le_bytes()]).to_bytes() }
fn require_token_2022(token_program: &Interface<TokenInterface>) -> Result<()> {
    require_token_2022_key(token_program.key())
}
fn require_token_2022_key(token_program: Pubkey) -> Result<()> {
    require_keys_eq!(token_program, token_2022::ID, FantasyPoolError::InvalidTokenProgram);
    Ok(())
}
fn verify_merkle(mut node: [u8; 32], proof: &[[u8; 32]], root: [u8; 32]) -> bool {
    for sibling in proof { node = if node <= *sibling { hashv(&[&node, sibling]).to_bytes() } else { hashv(&[sibling, &node]).to_bytes() }; }
    node == root
}

#[derive(Accounts)]
#[instruction(fixture_id_hash: [u8; 32], stake_tier: u64)]
pub struct CreateContest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Contest::LEN,
        seeds = [b"contest", fixture_id_hash.as_ref(), stake_tier.to_le_bytes().as_ref()],
        bump
    )]
    pub contest: Account<'info, Contest>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = contest,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EnterContest<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut)]
    pub contest: Account<'info, Contest>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub wallet_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = contest.vault @ FantasyPoolError::InvalidVault,
        associated_token::mint = mint,
        associated_token::authority = contest,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = wallet,
        space = 8 + Entry::LEN,
        seeds = [b"entry", contest.key().as_ref(), wallet.key().as_ref()],
        bump
    )]
    pub entry: Account<'info, Entry>,
    #[account(address = token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishSettlement<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ FantasyPoolError::Unauthorized)]
    pub contest: Account<'info, Contest>,
    #[account(
        mut,
        address = contest.vault @ FantasyPoolError::InvalidVault,
        associated_token::mint = mint,
        associated_token::authority = contest,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(init, payer = authority, space = 8 + Settlement::LEN, seeds = [b"settlement", contest.key().as_ref()], bump)]
    pub settlement: Account<'info, Settlement>,
    #[account(address = token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut, has_one = mint @ FantasyPoolError::InvalidStake)]
    pub contest: Account<'info, Contest>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub wallet_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = contest.vault @ FantasyPoolError::InvalidVault,
        associated_token::mint = mint,
        associated_token::authority = contest,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, seeds = [b"entry", contest.key().as_ref(), wallet.key().as_ref()], bump = entry.bump, has_one = wallet @ FantasyPoolError::Unauthorized)]
    pub entry: Account<'info, Entry>,
    #[account(mut, seeds = [b"settlement", contest.key().as_ref()], bump = settlement.bump, constraint = settlement.contest == contest.key() @ FantasyPoolError::InvalidSettlement)]
    pub settlement: Account<'info, Settlement>,
    #[account(address = token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct CancelContest<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ FantasyPoolError::Unauthorized)]
    pub contest: Account<'info, Contest>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut, has_one = mint @ FantasyPoolError::InvalidStake)]
    pub contest: Account<'info, Contest>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub wallet_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = contest.vault @ FantasyPoolError::InvalidVault,
        associated_token::mint = mint,
        associated_token::authority = contest,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, seeds = [b"entry", contest.key().as_ref(), wallet.key().as_ref()], bump = entry.bump, has_one = wallet @ FantasyPoolError::Unauthorized)]
    pub entry: Account<'info, Entry>,
    #[account(address = token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[error_code]
pub enum FantasyPoolError {
    #[msg("Contest is locked.")]
    ContestLocked,
    #[msg("Contest is unavailable.")]
    ContestUnavailable,
    #[msg("Entry already exists for this wallet.")]
    DuplicateEntry,
    #[msg("Incorrect contest mint or stake amount.")]
    InvalidStake,
    #[msg("The provided vault does not belong to this contest.")]
    InvalidVault,
    #[msg("Settlement payout exceeds vault balance.")]
    InvalidSettlement,
    #[msg("Prize or refund has already been claimed.")]
    AlreadyClaimed,
    #[msg("Caller is not authorized for this operation.")]
    Unauthorized,
    #[msg("The supplied Merkle proof is invalid.")]
    InvalidProof,
    #[msg("Only Token-2022 is supported for fantasy contests.")]
    InvalidTokenProgram,
    #[msg("Settlement cannot be published before contest lock.")]
    SettlementBeforeLock,
}

#[account]
pub struct Contest {
    pub authority: Pubkey,
    pub fixture_id_hash: [u8; 32],
    pub stake_tier: u64,
    pub mint: Pubkey,
    pub stake_amount: u64,
    pub lock_ts: i64,
    pub vault: Pubkey,
    pub settlement_root: [u8; 32],
    pub finalized: bool,
    pub cancelled: bool,
    pub bump: u8,
}
impl Contest {
    // authority + fixture hash + tier + mint + stake + lock + vault + root + flags + bump
    pub const LEN: usize = 32 + 32 + 8 + 32 + 8 + 8 + 32 + 32 + 1 + 1 + 1;
}

#[account]
pub struct Entry {
    pub contest: Pubkey,
    pub wallet: Pubkey,
    pub team_hash: [u8; 32],
    pub claimed: bool,
    pub refunded: bool,
    pub bump: u8,
}
impl Entry { pub const LEN: usize = 99; }

#[account]
pub struct Settlement {
    pub contest: Pubkey,
    pub payout_total: u64,
    pub claimed_total: u64,
    pub root: [u8; 32],
    pub published_at: i64,
    pub bump: u8,
}
impl Settlement { pub const LEN: usize = 89; }

#[cfg(test)]
mod account_layout_tests {
    use super::*;

    #[test]
    fn account_space_matches_serialized_fields() {
        assert_eq!(Contest::LEN, 187);
        assert_eq!(Entry::LEN, 99);
        assert_eq!(Settlement::LEN, 89);
    }

    #[test]
    fn token_program_guard_rejects_legacy_spl_token() {
        assert!(require_token_2022_key(token_2022::ID).is_ok());
        assert!(require_token_2022_key(anchor_spl::token::ID).is_err());
    }
}
