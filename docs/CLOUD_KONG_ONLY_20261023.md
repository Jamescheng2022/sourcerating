# Approved kong-only change — not applied

User approved only the internal test hostname `kong` at 2026-10-23 11:01 UTC. This does not authorize other network, credential, production, migration or cost changes.

Fresh runtime read: environment **lushupai-v2**, instance `ccarenv_b64_Y2NhcmVudl85MDlhZmM5Nzk5ZDg4MTkxYjM4MjkyZDhkN2Y0MDkzMA`, config `e5a3129b-cb2c-41e3-825a-f0bf281a1a29~cecfg_6adaeab0e5f0819b97d9ae373485ac81`, published version `e5a3129b-cb2c-41e3-825a-f0bf281a1a29~cecfgver_6adaee215c48819bbfb3e6250b23fe47`. Runtime desired/observed revision 2, observations current, restricted network state unknown, custom hosts only the two fonts domains. Local supported network snapshot also lacks kong. See ../evidence/cloud-20261023-kong-only/proposal.json for timestamp and exact values.

## Verified minimum proposed diff

```diff
 network.allowed_domains:
   - fonts.googleapis.com
   - fonts.gstatic.com
+  - kong
```

Preserve the `package_managers` preset, restricted mode, all other restrictions and all published repository/script values. No wildcard, URL, port, secret destination, TCP grant or broader internet permission. This is a proposed single-field change description, **not a saved separate clean platform draft** and not an applied policy.

## Existing draft must be retained, not published wholesale

Bound draft `e5a3129b-cb2c-41e3-825a-f0bf281a1a29~cecfgdraft_6adaf828aaa0819b85dab2efc29f0707`, revision 3, uses that published base. Its network list already contains kong, but it also contains install/start-script changes and repository pins to old commits (`535fa8b...` LUSHUPAI, `2b7d52f...` SourceRating). Do not reset those edits, substitute current HEADs, copy draft scripts into a supposed published base, or bulk-publish it. The current tools cannot read the full immutable published scripts/repository membership, so their original values cannot be reconstructed by guessing from the mixed draft.

No draft update was called: saving the same network list would leave the mixed draft mixed, not create the authorized isolated change. The original draft was read and left intact. Application source/credentials/network were not changed for this action.

## Exact setting and missing operation

Open the saved Work cloud environment **lushupai-v2** → **Environment settings** → restricted **Network / Internet access**, custom allowed domains (`network.allowed_domains`). The authorized change is adding exactly `kong` to the published two-font list. An owner/platform operator must apply a network-only change against the published version above while retaining revision 3's unrelated unpublished edits. If the UI only offers publishing the entire mixed draft, **do not use that operation**: a separate/base-version network edit or field-only publish capability is needed. No claim is made that the current UI supports this isolation.

The available tool `update_environment_config_draft` can save fields into the bound draft only. It cannot create/select another draft, publish, apply or restart the environment. No supported publish/apply tool is available. This is a missing operation capability, not a request to approve kong again; approval already exists.

After the operator applies the minimal change, read runtime status again. Require current observations, matching updated desired/observed revision and policy **enforced** with kong included. Only then retry the previously denied invitation gateway operation once. Stop on a new denial; do not bypass policy or weaken signatures/JWT/RLS. If it succeeds, run actual invite/bootstrap/join, message persistence, verified attachment upload/download and full archive-byte/hash checks with synthetic accounts, including cross-account/removal denials. Existing empty-room/archive fixture passes are not substitutes. No gateway retry or GitHub deployment-record read occurred this round.
