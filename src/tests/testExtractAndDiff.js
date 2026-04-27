import {
  extractRelevantContent,
  detectAdditions
} from "../helpers/scraperHelpers.js";

// PASTE CONTENT 1 BETWEEN THESE BACKTICKS
const content1 = `
![Image 1: UpdatezHUB](https://zealy-webapp-images-prod.s3.eu-west-1.amazonaws.com/public/45233d5d-4576-4abc-a519-d3cce287cfba-logo.png)
#### UpdatezHUB

[Home](https://zealy.io/)Search among my communities

![Image 2: Earn rewards](https://zealy.io/nstatic/zaps-reward-2.webp)
Earn rewards

[Create new community](https://zealy.io/create-community)[Discover communities](https://zealy.io/explore)

UpdatezHUB

Information

[Quests](https://zealy.io/cw/updatezhub/questboard/)[Leaderboard](https://zealy.io/cw/updatezhub/leaderboard)

[![Image 3](https://cdn.ixncdn.com/cdn-cgi/image/onerror=redirect,fit=cover,width=600,height=316,format=auto,dpr=1/https://r2.ixncdn.com/up/asset/c92bb77ade/88e45722a7.png?)](https://web.hypelab.com/click?as=7Lwnmohaaafj&campaign_slug=4357111cbc&creative_set_slug=1647fbd5c4&placement_slug=2e91d4f939)

![Image 4](https://cdn.ixncdn.com/cdn-cgi/image/onerror=redirect,fit=cover,width=126,height=126,format=auto,dpr=1/https://r2.ixncdn.com/up/asset/6bbf8c64c0/b34e00bd36.png?)Rainbet
20k Weekly Raffle FREE ticket , 3000+ Slots/Originals/Sports

20k Weekly Raffle FREE ticket , 3000+ Slots/Originals/Sports, Instant Withdrawals - Provably Fair.

Claim Ticket

Daily Challenge

Earn up to  50 Zaps

0 / 3

Today progress

Complete Challenge

Trade $SCOR. Earn USDC. DAILY.

$200 USDC is shared EVERY day. Hold $SCOR on KRAKEN, register on Zealy, and earn your slice — anywhere from $1 to $200 daily depending on your share of the pool.

[START EARNING NOW](https://zealy.io/cw/scor/trade/4cc9012f-688a-455f-a666-08ac9c078096)

Join the community to start completing quests and claiming rewards.Connect to Zealy

Onboarding.

Onboarding.

0 / 11

[Welcome. Daily](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/de42d2a1-e3ee-4e61-b5e2-cc197e46d528)

All

![Image 5](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Join our discord.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/b5c5229a-c857-4968-a2ab-bb69679db139)

All

![Image 6](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

10 

[Join our Telegram.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/d49b01be-d36a-466d-80de-9a238d8f2135)

All

![Image 7](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Follow our founder.😎](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/b3b1434e-2c9a-45a6-8e3f-d76695ded24c)

All

![Image 8](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

50 

[Daily claim. Daily](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/f83eedac-bc7e-405b-8d0e-c719ec40f172)

All

![Image 9](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

1 

[join our telegram group.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/13839830-f086-41bf-8c75-e33af2cfcbd9)

All

![Image 10](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

50 

[Testis](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/bd7f9932-5b3c-4702-a995-157cfecc95c7)

All

![Image 11](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Jargonssss](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/fba27d16-2b35-4c2b-bee7-3724eba80421)

All

![Image 12](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[WOOOOWWW](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/35a0e6dc-394d-4963-824a-a0e9bb3ebe90)

All

![Image 13](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[woooo aaaa](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/4dcb988e-0e20-4d5e-a7ae-2dd6ddb00065)

All

![Image 14](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

Follow us on X.

All

![Image 15](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

Locked

###### Your privacy

We and [our partners](https://zealy.notion.site/ZEALY-COOKIE-POLICY-3d4051c43a394e0bb6a9a66707889ece) save information on your device to offer a customized experience and enable visitor statistics. You decide which type of cookies you accept in addition to the necessary ones needed for the website to work. You may change your settings at any time by clicking on [Cookie preferences](https://zealy.io/consent-preferences) in the footer.

See our [Cookie Policy](https://zealy.notion.site/ZEALY-COOKIE-POLICY-3d4051c43a394e0bb6a9a66707889ece) for more info.

Accept all Only necessary[Customize](https://zealy.io/consent-preferences)

# Join UpdatezHUB | Zealy
![Image 17](https://t.co/1/i/adsct?bci=4&dv=UTC%26en-US%26Google%20Inc.%26Linux%20x86_64%26255%26800%26600%268%2624%26800%26600%260%26na&eci=3&event=%7B%7D&event_id=c585ac4a-09cf-49a4-9a2d-913f9eb1e43b&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=5ba16380-0b7a-4abb-b849-c91febfb0db0&pt=Join%20UpdatezHUB%20%7C%20Zealy&tw_document_href=https%3A%2F%2Fzealy.io%2Fcw%2Fupdatezhub%2Fquestboard%2F%3Ft%3D1777299583364&tw_iframe_status=0&tw_pid_src=1&twpid=tw.1777299586115.191199942431329444&txn_id=ol2sa&type=javascript&version=2.3.53)![Image 18](https://analytics.twitter.com/1/i/adsct?bci=4&dv=UTC%26en-US%26Google%20Inc.%26Linux%20x86_64%26255%26800%26600%268%2624%26800%26600%260%26na&eci=3&event=%7B%7D&event_id=c585ac4a-09cf-49a4-9a2d-913f9eb1e43b&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=5ba16380-0b7a-4abb-b849-c91febfb0db0&pt=Join%20UpdatezHUB%20%7C%20Zealy&tw_document_href=https%3A%2F%2Fzealy.io%2Fcw%2Fupdatezhub%2Fquestboard%2F%3Ft%3D1777299583364&tw_iframe_status=0&tw_pid_src=1&twpid=tw.1777299586115.191199942431329444&txn_id=ol2sa&type=javascript&version=2.3.53)

## Zealy Browse promotion

Discover Zealy Browse and join the Telegram group for browsing quests.

![Image 19: Zealy Browse mascot](https://zealy.io/nstatic/mascot-happy.png)

New • Zealy Browse

## Get paid in USDC to browse the web

Install our Chrome extension, complete short browsing quests on apps you already use, and earn real USDC for every verified recording.

Top tester made $68.20 this week

[Install extension](https://chromewebstore.google.com/detail/zealy-browse/aackhiaohipodeelnlodgjhhhnjamogh)[Join Telegram](https://t.me/+6gu4pbuVYfs0Mjlk)

[Read the guide](https://zealy.notion.site/Earn-money-by-training-AI-The-Guide-344d7dcc684880a29ac4ca4928b842b8?source=copy_link)
`;

// PASTE CONTENT 2 BETWEEN THESE BACKTICKS
const content2 = `
![Image 1: UpdatezHUB](https://zealy-webapp-images-prod.s3.eu-west-1.amazonaws.com/public/45233d5d-4576-4abc-a519-d3cce287cfba-logo.png)
#### UpdatezHUB

[Home](https://zealy.io/)Search among my communities

![Image 2: Earn rewards](https://zealy.io/nstatic/zaps-reward-2.webp)
Earn rewards

[Create new community](https://zealy.io/create-community)[Discover communities](https://zealy.io/explore)

UpdatezHUB

Information

[Quests](https://zealy.io/cw/updatezhub/questboard/)[Leaderboard](https://zealy.io/cw/updatezhub/leaderboard)

[](https://zealy.io/cw/updatezhub/questboard/?t=1777299521549)

![Image 3](https://zealy.io/cw/updatezhub/questboard/?t=1777299521549)

Daily Challenge

Earn up to  50 Zaps

0 / 3

Today progress

Complete Challenge

Trade $SCOR. Earn USDC. DAILY.

$200 USDC is shared EVERY day. Hold $SCOR on KRAKEN, register on Zealy, and earn your slice — anywhere from $1 to $200 daily depending on your share of the pool.

[START EARNING NOW](https://zealy.io/cw/scor/trade/4cc9012f-688a-455f-a666-08ac9c078096)

Join the community to start completing quests and claiming rewards.Connect to Zealy

Onboarding.

Onboarding.

0 / 11

[Welcome. Daily](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/de42d2a1-e3ee-4e61-b5e2-cc197e46d528)

All

![Image 4](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Join our discord.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/b5c5229a-c857-4968-a2ab-bb69679db139)

All

![Image 5](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

10 

[Join our Telegram.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/d49b01be-d36a-466d-80de-9a238d8f2135)

All

![Image 6](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Follow our founder.😎](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/b3b1434e-2c9a-45a6-8e3f-d76695ded24c)

All

![Image 7](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

50 

[Daily claim. Daily](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/f83eedac-bc7e-405b-8d0e-c719ec40f172)

All

![Image 8](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

1 

[join our telegram group.](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/13839830-f086-41bf-8c75-e33af2cfcbd9)

All

![Image 9](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

50 

[Testis](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/bd7f9932-5b3c-4702-a995-157cfecc95c7)

All

![Image 10](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[Jargonssss](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/fba27d16-2b35-4c2b-bee7-3724eba80421)

All

![Image 11](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[WOOOOWWW](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/35a0e6dc-394d-4963-824a-a0e9bb3ebe90)

All

![Image 12](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

[woooo aaaa](https://zealy.io/cw/updatezhub/questboard/ff4ba74e-303d-4aef-a3b8-ebaa644568e7/4dcb988e-0e20-4d5e-a7ae-2dd6ddb00065)

All

![Image 13](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

Follow us on X.

All

![Image 14](https://zealy.io/_next/static/media/xp-reward.5a1521c2.webp)Xp 

100 

Locked

###### Your privacy

We and [our partners](https://zealy.notion.site/ZEALY-COOKIE-POLICY-3d4051c43a394e0bb6a9a66707889ece) save information on your device to offer a customized experience and enable visitor statistics. You decide which type of cookies you accept in addition to the necessary ones needed for the website to work. You may change your settings at any time by clicking on [Cookie preferences](https://zealy.io/consent-preferences) in the footer.

See our [Cookie Policy](https://zealy.notion.site/ZEALY-COOKIE-POLICY-3d4051c43a394e0bb6a9a66707889ece) for more info.

Accept all Only necessary[Customize](https://zealy.io/consent-preferences)

# Join UpdatezHUB | Zealy
![Image 16](https://t.co/1/i/adsct?bci=4&dv=UTC%26en-US%26Google%20Inc.%26Linux%20x86_64%26255%26800%26600%268%2624%26800%26600%260%26na&eci=3&event=%7B%7D&event_id=c474175f-8609-4563-88e8-49a5cce023a2&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=29c58d23-ee6e-4fb1-8160-c4abdca54b34&pt=Join%20UpdatezHUB%20%7C%20Zealy&tw_document_href=https%3A%2F%2Fzealy.io%2Fcw%2Fupdatezhub%2Fquestboard%2F%3Ft%3D1777299521549&tw_iframe_status=0&tw_pid_src=1&twpid=tw.1777299523727.579536425471196057&txn_id=ol2sa&type=javascript&version=2.3.53)![Image 17](https://analytics.twitter.com/1/i/adsct?bci=4&dv=UTC%26en-US%26Google%20Inc.%26Linux%20x86_64%26255%26800%26600%268%2624%26800%26600%260%26na&eci=3&event=%7B%7D&event_id=c474175f-8609-4563-88e8-49a5cce023a2&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=29c58d23-ee6e-4fb1-8160-c4abdca54b34&pt=Join%20UpdatezHUB%20%7C%20Zealy&tw_document_href=https%3A%2F%2Fzealy.io%2Fcw%2Fupdatezhub%2Fquestboard%2F%3Ft%3D1777299521549&tw_iframe_status=0&tw_pid_src=1&twpid=tw.1777299523727.579536425471196057&txn_id=ol2sa&type=javascript&version=2.3.53)

## Zealy Browse promotion

Discover Zealy Browse and join the Telegram group for browsing quests.

![Image 18: Zealy Browse mascot](https://zealy.io/nstatic/mascot-happy.png)

New • Zealy Browse

## Get paid in USDC to browse the web

Install our Chrome extension, complete short browsing quests on apps you already use, and earn real USDC for every verified recording.

Top tester made $68.20 this week

[Install extension](https://chromewebstore.google.com/detail/zealy-browse/aackhiaohipodeelnlodgjhhhnjamogh)[Join Telegram](https://t.me/+6gu4pbuVYfs0Mjlk)

[Read the guide](https://zealy.notion.site/Earn-money-by-training-AI-The-Guide-344d7dcc684880a29ac4ca4928b842b8?source=copy_link)
`;

const rel1 = extractRelevantContent(content1);
const rel2 = extractRelevantContent(content2);

console.log('=== Equal? ===', rel1 === rel2);
console.log('=== Diff ===');
console.log(detectAdditions(content1, content2) || 'No additions');
console.log(detectAdditions(content1, content2) || 'No additions');