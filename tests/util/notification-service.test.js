const { notify } = require('../../util/notification-service.js');
jest.mock('../../models/Notification.js', () => ({
  find: jest.fn(),
}));
jest.mock('../../models/Favorite.js', () => ({
  getFavorites: jest.fn(),
}));
jest.mock('../../util/dish-menu-service.js', () => ({
  getTodaysMenu: jest.fn(),
}));

const Notification = require('../../models/Notification.js');
const { getFavorites } = require('../../models/Favorite.js');
const { getTodaysMenu } = require('../../util/dish-menu-service.js');

describe('Notification Service', () => {
  it('should send notifications when favorite dishes are available', async () => {
    const client = {
      users: {
        send: jest.fn(),
      },
    };

    Notification.find.mockResolvedValue([
      { userId: '12345', notification: true },
    ]);
    getFavorites.mockResolvedValue([{ dishId: 'abc123' }]);
    getTodaysMenu.mockResolvedValue([{ _id: 'abc123', name: 'Spaghetti' }]);

    await notify(client);

    expect(client.users.send).toHaveBeenCalled();
  });

  it('should not send notifications when there are no favorite dishes', async () => {
    const client = {
      users: {
        send: jest.fn(),
      },
    };

    Notification.find.mockResolvedValue([
      { userId: '12345', notification: true },
    ]);
    getFavorites.mockResolvedValue([{ dishId: 'xyz789' }]);
    getTodaysMenu.mockResolvedValue([{ _id: 'abc123', name: 'Spaghetti' }]);

    await notify(client);

    expect(client.users.send).not.toHaveBeenCalled();
  });
});
