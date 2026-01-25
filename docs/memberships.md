# Gym Membership & Access Control System

This module allows businesses to manage gym memberships, track attendance (check-in/out), and use RFID/NFC chip cards for quick access control.

## 1. Membership Plans

Before adding members, ensure you have active plans.

- Go to **Memberships > Plans Tab**.
- Click **Add Plan**.
- Define details like Duration (days), Price, and Benefits.
- Set **Max Check-ins** to 0 for unlimited access.

## 2. Managing Members

### Adding a Member

1. Go to **Memberships > Members Tab**.
2. Click **Add Member**.
3. Select an existing Customer and a Plan.
4. (Optional) Process payment immediately via Invoice.

### Viewing Member Details

Click on any member's name in the list to view their detailed profile, including:

- Membership Status & Validity Dates.
- Remaining Days.
- Check-in History (Time, Duration).
- Assigned Card UID.

## 3. Chip Cards (RFID/NFC)

You can assign low-cost generic RFID/NFC cards (13.56MHz or similar) to members for quick access.

### Assigning a Card

1. Open the **Member Detail Page** (`/memberships/[id]`).
2. Click the **Assign Card** button in the header.
3. When the modal prompts "Scan card now", tap the card on your reader.
4. The Card UID (e.g., `a1-b2-c3-d4`) will populate. Press Enter or click Assign.

### Using Cards

Once assigned, the card acts as the member's ID for check-in and check-out.

## 4. Check-in & Check-out Flow

### Quick Check-In (Scanner Mode)

The main search bar on the Memberships page supports direct card scanning.

1. Navigate to **Memberships**.
2. Ensure the **Search** input is focused (click it or press `/`).
3. **Tap the Member's Card** on the reader.
   - The reader acts as a keyboard, typing the UID + Enter.
4. **Automatic Action**:
   - If the member is **Signed Out** -> They are **Checked IN**. (Green Success Toast)
   - If the member is **Signed In** -> They are **Checked OUT**. (Blue Info Toast)
   - Duration is calculated and recorded upon check-out.

### Manual Check-In/Out

You can also manually check members in/out via the **Member Detail Page** buttons.

## 5. Data & Synchronization

- check-ins are stored locally and synced to Nostr (Kind 38003).
- Use the **Check-in History** table in member details to view past sessions and duration.
