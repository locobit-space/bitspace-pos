import type { NostrUser, UserInfo } from "~/types";

export const useNostrStorage = () => {
  const accounts = useState<UserInfo[]>("accounts", () => []);
  const _userKey = 'nostrUser';
  const _currentUser = 'currentUserInfo';
  /**
   * Save user info to local storage
   */
  const saveUser = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    // Save user keys
    if (userInfo.userKeys) {
      localStorage.setItem(_userKey, JSON.stringify(userInfo.userKeys));
    }

    // Save current user info
    localStorage.setItem(_currentUser, JSON.stringify(userInfo));
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

    localStorage.setItem("userList", JSON.stringify(_items));
    accounts.value = storedList;
  };

  /**
   * Load user info from local storage
   */
  const loadUser = (pubkey: string): UserInfo | null => {
    if (!import.meta.client) return null;

    const storedList = JSON.parse(localStorage.getItem("userList") || "[]");
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

    const currentUserData = localStorage.getItem(_currentUser);
    if (currentUserData) {
      userInfo = JSON.parse(currentUserData);
    }

    const userData = localStorage.getItem(_userKey);
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

    const items = JSON.parse(localStorage.getItem("userList") || "[]");
    accounts.value = items;
    return items;
  };

  /**
   * Clear user data from local storage
   */
  const clearUserData = () => {
    if (!import.meta.client) return;

    localStorage.removeItem(_userKey);
    localStorage.removeItem(_currentUser);
  };

  // remove account
  const removeAccount = (pubkey: string) => {
    const storedList = JSON.parse(localStorage.getItem("userList") || "[]");
    const _items = storedList.filter(
      (item: UserInfo) => item.pubkey !== pubkey
    );
    localStorage.setItem("userList", JSON.stringify(_items));
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
