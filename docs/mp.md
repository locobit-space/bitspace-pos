## project manager

### Key Design Notes

PM_ISSUE uses d tag as the issue ID → fully replaceable (status updates replace the event)

PM_COMMENT should use a regular event kind if you want immutable comments, but 31103 keeps it replaceable (editable comments)

For ephemeral notifications like "User X moved issue to Done", you could fire a 1050 (POS_ALERT) or add a new 1051 kind
