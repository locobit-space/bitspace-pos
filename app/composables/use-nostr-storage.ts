import type { NostrUser, UserInfo } from "~/types";

// ============================================
// 📦 STORAGE KEYS (Aligned with use-users.ts)
// ============================================
const STORAGE_KEYS = {
  NOSTR_KEYS: 'nostrUser',              // Nostr private/public keys
  NOSTR_PROFILE: 'nostr_user_profile',  // Nostr profile data (name, picture, etc)
  ACCOUNTS_LIST: 'userList',            // List of all Nostr accounts
} as const;

export const useNostrStorage = () => {
  const accounts = useState<UserInfo[]>("accounts", () => []);

  /**
   * Save user info to local storage
   */
  const saveUser = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    // Save user keys
    if (userInfo.userKeys) {
      localStorage.setItem(STORAGE_KEYS.NOSTR_KEYS, JSON.stringify(userInfo.userKeys));
    }

    // Save profile data (unified key)
    localStorage.setItem(STORAGE_KEYS.NOSTR_PROFILE, JSON.stringify({
      pubkey: userInfo.pubkey,
      name: userInfo.name,
      display_name: userInfo.displayName || userInfo.display_name,
      picture: userInfo.picture,
      about: userInfo.about,
      nip05: userInfo.nip05,
      banner: userInfo.banner,
      lud16: userInfo.lud16,
      website: userInfo.website,
    }));
    
    // Update accounts list
    updateAccountsList(userInfo);
  };

  /**
   * Update accounts list in local storage
   */
  const updateAccountsList = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    const storedList: UserInfo[] = accounts.value;

    const exists = storedList.find((item) => item.pubkey === userInfo.pubkey);

    if (!exists) {
      storedList.push({
        pubkey: userInfo.pubkey,
        displayName:
          userInfo.display_name || `Account ${storedList.length + 1}`,
        userKeys: userInfo.userKeys,
        name: userInfo.name || "",
      });
    }
    // Update accounts list
    const _items = storedList.map((item) => {
      return item.pubkey === userInfo.pubkey
        ? {
            ...item,
            ...userInfo,
            userKeys: item.userKeys,
          }
        : {
            ...item,
            display_name:
              item.display_name || `Account ${storedList.length + 1}`,
          };
    });

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(_items));
    accounts.value = storedList;
  };

  /**
   * Load user info from local storage
   */
  const loadUser = (pubkey: string): UserInfo | null => {
    if (!import.meta.client) return null;

    const storedList = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]");
    return storedList.find((item: UserInfo) => item.pubkey === pubkey) || null;
  };

  /**
   * Load current user from local storage
   */
  const loadCurrentUser = (): {
    userInfo: UserInfo | null;
    user: NostrUser | null;
  } => {
    if (!import.meta.client) return { userInfo: null, user: null };

    let userInfo = null;
    let user = null;

    const profileData = localStorage.getItem(STORAGE_KEYS.NOSTR_PROFILE);
    if (profileData) {
      userInfo = JSON.parse(profileData);
    }

    const userData = localStorage.getItem(STORAGE_KEYS.NOSTR_KEYS);
    if (userData) {
      user = JSON.parse(userData);
    }

    return { userInfo, user };
  };

  /**
   * Load all accounts from local storage
   */
  const loadAllAccounts = (): UserInfo[] => {
    if (!import.meta.client) return [];

    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]");
    accounts.value = items;
    return items;
  };

  /**
   * Clear user data from local storage
   */
  const clearUserData = () => {
    if (!import.meta.client) return;

    localStorage.removeItem(STORAGE_KEYS.NOSTR_KEYS);
    localStorage.removeItem(STORAGE_KEYS.NOSTR_PROFILE);
  };

  // remove account
  const removeAccount = (pubkey: string) => {
    const storedList = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]");
    const _items = storedList.filter(
      (item: UserInfo) => item.pubkey !== pubkey
    );
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(_items));
    accounts.value = _items;
  };

  return {
    accounts,
    saveUser,
    loadUser,
    loadCurrentUser,
    loadAllAccounts,
    clearUserData,
    updateAccountsList,
    removeAccount,
  };
};
