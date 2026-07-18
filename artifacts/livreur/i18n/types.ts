/**
 * Canonical type for all translation dictionaries.
 * All string values are typed as `string` (not as exact literals)
 * so Arabic, English and French translations are mutually assignable.
 */
export interface Translations {
  common: {
    retry: string;
    cancel: string;
    confirm: string;
    loading: string;
    error: string;
    success: string;
    na: string;
    back: string;
    save: string;
    close: string;
    yes: string;
    no: string;
  };
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    forgotPassword: string;
    loginBtn: string;
    sessionExpired: string;
    invalidCreds: string;
  };
  gps: {
    unknown: string;
    searching: string;
    available: string;
    lowAccuracy: string;
    temporarilyUnavailable: string;
    disabled: string;
    permissionDenied: string;
    enableInSettings: string;
    permissionRequired: string;
    openSettings: string;
  };
  availability: {
    goOnline: string;
    goOffline: string;
    online: string;
    offline: string;
    toggling: string;
    confirmOffline: string;
    confirmOfflineMsg: string;
  };
  orders: {
    newOrder: string;
    accept: string;
    decline: string;
    noActiveOrders: string;
    goOnlineToReceive: string;
    waitingForOrders: string;
    activeOrders: string;
    availableOrders: string;
    history: string;
    orderRef: string;
    restaurant: string;
    customer: string;
    distance: string;
    duration: string;
    amount: string;
    items: string;
    estimatedEarnings: string;
    timeLeft: string;
    orderExpired: string;
    orderTaken: string;
    countdownExpired: string;
    declineReason: string;
    declineReasons: {
      TOO_FAR: string;
      VEHICLE_ISSUE: string;
      PERSONAL: string;
      TRAFFIC: string;
      OTHER: string;
    };
  };
  delivery: {
    navigateToPickup: string;
    arrivedAtPickup: string;
    confirmPickup: string;
    navigateToCustomer: string;
    arrivedAtDest: string;
    confirmDelivery: string;
    otpCode: string;
    otpPrompt: string;
    otpInvalid: string;
    delivered: string;
    earningsCredited: string;
    navigateWith: string;
    googleMaps: string;
    appleMaps: string;
    inApp: string;
    callCustomer: string;
    orderCancelled: string;
    cancelledReason: string;
  };
  earnings: {
    title: string;
    today: string;
    week: string;
    month: string;
    total: string;
    deliveries: string;
    avgPerDelivery: string;
    onlineTime: string;
    history: string;
    noHistory: string;
  };
  profile: {
    title: string;
    completeProfile: string;
    incompleteAlert: string;
    vehicle: string;
    plate: string;
    nationalId: string;
    licenseNumber: string;
  };
  errors: {
    VALIDATION: string;
    NETWORK: string;
    AUTHENTICATION: string;
    AUTHORIZATION: string;
    TIMEOUT: string;
    GPS: string;
    UNKNOWN: string;
    networkRetry: string;
  };
  notifications: {
    title: string;
    empty: string;
    newOrder: string;
  };
}
