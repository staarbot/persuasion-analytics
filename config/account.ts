// Per-account configuration. In the destination app this becomes a settings
// record per connected ad account — nothing below is hardcoded into logic.

export const accountConfig = {
  accountName: "Persuasion Melody",
  currency: "USD",

  /**
   * FE/BE classification: a sale is Front End if and only if its productId
   * matches designatedFeProductId. Everything else — including a first-time
   * buyer who goes straight to high ticket — is Back End.
   */
  designatedFeProductId: "prod_fe_persuasion_melody",

  /** Creative code prefixes (swap "I" back to "S" here if preferred) */
  creativePrefix: { video: "V", image: "I" },
  copyPrefix: "C",

  /** Preferred revenue source order: first available wins, always labeled */
  revenueSourcePriority: ["stripe", "meta_attributed", "manual"] as const,
};
