# API Integration Requirements

## X/Twitter API

- OAuth 2.0 authentication
- POST /2/tweets (create tweet)
- POST /2/tweets/:id/replies (for URL threading)
- Rate limit handling
- Error handling for:
  - Duplicate content
  - Rate limits
  - Authentication failures

## LinkedIn API

- OAuth 2.0 authentication
- POST /v2/ugcPosts (create post)
- POST /v2/socialActions/:urn/comments (for URL commenting)
- Rate limit handling
- Error handling for:
  - Invalid content
  - Rate limits
  - Authentication failures

## Telegram API

- Bot token authentication
- sendMessage for failure notifications
- Simple webhook or polling setup

---
