# Non-Functional Requirements

## Performance

- Schedule creation < 2 seconds
- Post publishing triggered within 30 seconds of scheduled time
- Calendar view loads < 1 second

## Reliability

- 99% uptime for scheduling service
- Auto-retry for transient API failures
- Graceful degradation if one platform API is down

## Usability

- Mobile-responsive design
- Keyboard shortcuts for power users
- Minimal clicks to schedule post

## Security

- Secure OAuth token storage
- HTTPS only
- Session timeouts
- No logging of post content

---
