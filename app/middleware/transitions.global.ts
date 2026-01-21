export default defineNuxtRouteMiddleware((to, from) => {
  // Define route depths
  const getDepth = (path: string) => {
    // Root
    if (path === "/") return 1;
    if (path === "/apps") return 1;

    // Main Features (Level 2)
    // Check if it's a main feature route (e.g. /pos, /orders) but NOT a sub-route (e.g. /pos/123)
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 1) return 2;

    // Sub-features/Details (Level 3)
    if (parts.length > 1) return 3;

    return 2;
  };

  const toDepth = getDepth(to.path);
  const fromDepth = getDepth(from.path);

  // 1. Depth-based Navigation (Drilling down/up)
  if (toDepth > fromDepth) {
    to.meta.pageTransition = { name: "slide-left", mode: "out-in" };
    from.meta.pageTransition = { name: "slide-left", mode: "out-in" };
    return;
  }

  if (toDepth < fromDepth) {
    to.meta.pageTransition = { name: "slide-right", mode: "out-in" };
    from.meta.pageTransition = { name: "slide-right", mode: "out-in" };
    return;
  }

  // 2. Sidebar Order Navigation (Same depth, e.g. POS -> Orders)
  if (toDepth === fromDepth && toDepth === 2) {
    const sidebarOrder = [
      "/",
      "/pos",
      "/orders",
      "/products",
      "/recipes",
      "/ingredients",
      "/customers",
      "/memberships",
      "/inventory",
      "/kitchen",
      "/reports",
      "/accounting",
      "/invoicing",
      "/delivery",
      "/contracts",
      "/settings",
    ];

    const toIndex = sidebarOrder.indexOf(to.path);
    const fromIndex = sidebarOrder.indexOf(from.path);

    if (toIndex !== -1 && fromIndex !== -1) {
      if (toIndex > fromIndex) {
        // Moving Down -> Slide Left (Forward feeling)
        to.meta.pageTransition = { name: "slide-left", mode: "out-in" };
        from.meta.pageTransition = { name: "slide-left", mode: "out-in" };
      } else {
        // Moving Up -> Slide Right (Back feeling)
        to.meta.pageTransition = { name: "slide-right", mode: "out-in" };
        from.meta.pageTransition = { name: "slide-right", mode: "out-in" };
      }
      return;
    }
  }

  // Default Fallback
  to.meta.pageTransition = { name: "page", mode: "out-in" };
});
