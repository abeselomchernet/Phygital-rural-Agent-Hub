import { z } from "zod";

const MerchantOrderId = z.string().regex(/^[A-Za-z0-9]+$/).max(64);
const SafeProviderId = z.string().regex(/^[A-Za-z0-9._~m-]+$/).max(256);
const SafeProviderText = (max: number) =>
  z    .string()
    .max(max)
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));
const ProviderCode = z.union([SafeProviderText(128), z.number().finite()]);

/**
 * Bounded response envelope based on current Ethio telecom FAQ evidence and
 * the project portal export. Passthrough is intentional because the current
 * provider response contract is not fully published/pinned yet.
 *
 * IMPORTANT: a preorder response creates at most correlated provider-order
 * evidence. It is not evidence that the customer paid, that funds settled, or
 * that PartnerFI posting occurred.
 */
export const TelebirrPreorderResponseEnvelopeSchema = z
  .object({
    result: SafeProviderText(32).optional(),
    code: ProviderCode.optional(),
    msg: SafeProviderText(512).optional(),
    errorCode: ProviderCode.optional(),
    errorMsg: SafeProviderText(512).optional(),
    nonce_str: SafeProviderText(128).optional(),
    sign: SafeProviderText(8192).optional(),
    sign_type: SafeProviderText(64).optional(),
    biz_content: z
      .object({
        merch_order_id: z.union([MerchantOrderId, z.null()]).optional(),
        prepay_id: z.union([SafeProviderId, z.null()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type TelebirrPreorderResponseEnvelope = z.infer<
  typeof TelebirrPreorderResponseEnvelopeSchema
>;

export type TelebirrPreorderClassification =
  | {
      state: "ORDER_CREATED";
      merchantOrderId: string;
      prepayId: string;
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "PROVIDER_REJECTED";
      providerCode?: string;
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "RESPONSE_BINDING_MISMATCH";
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "RESPONSE_UNVERIFIED";
      paymentConfirÖVC¢fÇ6S°¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6S°¢Ó° ¦gVæ7F–öâæ÷&ÖÆ—¦U&÷f–FW$6öFR‡fÇVS¢Væ¶æ÷vâ’°¢–b€¢G—VöbfÇVRÓÓÒ'7G&–ær"b`¢õå´Õ¦×£Ó’åó¢Õ×³Ã#‚BòçFW7B‡fÇVR¢¢&WGW&âfÇVS°¢–b‡G—VöbfÇVRÓÓÒ&çVÖ&W""bbçVÖ&W"æ—4f–æ—FR‡fÇVR’’&WGW&â7G&–ær‡fÇVR“°¢&WGW&âVæFVf–æVC°§Ğ ¢ò¢ ¢¢6Æ76–f–W2FVÆV&—'"&V÷&FW"&W7öç6Rv—F†÷WBVÆWfF–ær—BFò–ÖVçB÷ ¢¢6WGFÆVÖVçBWF†÷&—G’âF†R&W7öç6R6–væGW&R—2FVÆ–&W&FVÇ’äõBfW&–f–V@¢¢†W&R&V6W6RF†R7F—fR&W7öç6R×6–væGW&R÷V&Æ–2Ö¶W’6öçG&7B†2æ÷B–W@¢¢&VVâ–ææVBg&öÒWF†÷&—FF—fR7W'&VçBFö7VÖVçFF–öâà¢ ¢¢õ$DU%ô5$TDTB—2&WGW&æVBöæÇ’f÷"âW‡Æ–6—B5T44U52&W7VÇBv—F‚¢¢æöâÖV×G’6fR&W•ö–BæBW†7BÖW&6†çBÖ÷&FW"&–æF–ærâVæ¶æ÷vâ÷"'6Vç@¢¢÷WF6öÖW2&VÖ–â$U5ôå4UõTådU$”d”TBà¢¢ğ¦W‡÷'BgVæ7F–öâ6Æ76–g•FVÆV&—'%&V÷&FW%&W7öç6R€¢&s¢Væ¶æ÷vâÀ¢W‡V7FVDÖW&6†çD÷&FW$–C¢7G&–ærÀ¢“¢FVÆV&—'%&V÷&FW$6Æ76–f–6F–öâ°¢6öç7BW‡V7FVBÒÖW&6†çD÷&FW$–Bç'6R†W‡V7FVDÖW&6†çD÷&FW$–B“°¢6öç7B'6VBÒFVÆV&—'%&V÷&FW%&W7öç6TVçfVÆ÷U66†VÖç6fU'6R‡&r“°¢–b‚'6VBç7V66W72’°¢&WGW&â°¢7FFS¢%$U5ôå4UõTådU$”d”TB"À¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°¢Ğ ¢6öç7B&W7öç6RÒ'6VBæFF°¢6öç7BÖW&6†çD÷&FW$–BÒ&W7öç6Ræ&—¥ö6öçFVçCòæÖW&6…ö÷&FW%ö–BóòVæFVf–æVC°¢–b†ÖW&6†çD÷&FW$–BbbÖW&6†çD÷&FW$–BÓÒW‡V7FVB’°¢&WGW&â°¢7FFS¢%$U5ôå4Uô$”äD”äuôÔ•4ÔD4‚"À¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°¢Ğ ¢6öç7BW‡Æ–6—Df–ÇW&RĞ¢&W7öç6Rç&W7VÇCòçFõWW$66R‚’ÓÓÒ$d”Â"ÇÀ¢&W7öç6RæW'&÷$6öFRÓÒVæFVf–æVBÇÀ¢&W7öç6RæW'&÷$×6rÓÒVæFVf–æVC°¢–b†W‡Æ–6—Df–ÇW&R’°¢&WGW&â°¢7FFS¢%$õd”DU%õ$T¤T5DTB"À¢&÷f–FW$6öFS ¢æ÷&ÖÆ—¦U&÷f–FW$6öFR‡&W7öç6RæW'&÷$6öFR’óğ¢æ÷&ÖÆ—¦U&÷f–FW$6öFR‡&W7öç6Ræ6öFR’À¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°¢Ğ ¢–b‡&W7öç6Rç&W7VÇCòçFõWW$66R‚’ÓÒ%5T44U52"’°¢&WGW&â°¢7FFS¢%$U5ôå4UõTådU$”d”TB"À¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°¢Ğ ¢6öç7B&W”–BÒ&W7öç6Ræ&—¥ö6öçFVçCòç&W•ö–BóòVæFVf–æVC°¢–b‚ÖW&6†çD÷&FW$–BÇÂ&W”–B’°¢&WGW&â°¢7FFS¢%$U5ôå4UõTådU$”d”TB"À¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°¢Ğ ¢&WGW&â°¢7FFS¢$õ$DU%ô5$TDTB"À¢ÖW&6†çD÷&FW$–BÀ¢&W”–BÀ¢–ÖVçD6öæf—&ÖVC¢fÇ6RÀ¢6WGFÆVÖVçD6öæf—&ÖVC¢fÇ6RÀ¢Ó°§Ğ