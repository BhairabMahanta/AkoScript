class CooldownManager {
  userDropCooldowns: Map<string, number>;
  userGrabCooldowns: Map<string, number>;

  constructor() {
    this.userDropCooldowns = new Map<string, number>();
    this.userGrabCooldowns = new Map<string, number>();
  }
}

export default new CooldownManager();
