/**
 * Small in-memory repository used only by unit tests. Production code always
 * uses MongoDB through repositories/userRepository.js.
 */
const createFakeUserRepository = () => {
  let sequence = 0;
  const users = [];

  const repository = {
    users,

    async findByEmail(email) {
      return users.find((user) => user.email === email) || null;
    },

    async findById(id) {
      return users.find((user) => user._id === String(id)) || null;
    },

    async create(data) {
      if (users.some((user) => user.email === data.email)) {
        const error = new Error('E11000 duplicate key error');
        error.code = 11000;
        throw error;
      }

      const user = {
        _id: `user-${++sequence}`,
        ...data,
        tokenVersion: 0,
        createdAt: new Date(),
        toSafeJSON() {
          return {
            id: this._id,
            name: this.name,
            email: this.email,
            createdAt: this.createdAt,
          };
        },
      };

      users.push(user);
      return user;
    },

    async setResetToken({ userId, tokenHash, expiresAt }) {
      const user = users.find((candidate) => candidate._id === String(userId));
      if (!user) return null;

      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpires = expiresAt;
      return user;
    },

    async clearResetToken({ userId }) {
      const user = users.find((candidate) => candidate._id === String(userId));
      if (!user) return null;

      delete user.resetPasswordToken;
      delete user.resetPasswordExpires;
      return user;
    },

    async resetPasswordWithToken({ tokenHash, passwordHash, now = new Date() }) {
      const user = users.find(
        (candidate) =>
          candidate.resetPasswordToken === tokenHash &&
          candidate.resetPasswordExpires &&
          candidate.resetPasswordExpires > now
      );

      if (!user) return null;

      user.password = passwordHash;
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      delete user.resetPasswordToken;
      delete user.resetPasswordExpires;
      return user;
    },
  };

  return repository;
};

const createFakeMailer = ({ configured = true, fail = false } = {}) => {
  const sent = [];

  return {
    sent,
    isConfigured: () => configured,
    async sendPasswordResetEmail(message) {
      if (fail) {
        const error = new Error('SMTP unavailable');
        error.code = 'ESMTP';
        throw error;
      }
      sent.push(message);
    },
  };
};

module.exports = { createFakeUserRepository, createFakeMailer };
