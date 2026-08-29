import { deviceService } from '../../services/deviceService';
import { apiRequest } from '../../utils/api';

jest.mock('../../utils/api', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(errorMessage: string, statusCode: number) {
      super(errorMessage);
      this.status = statusCode;
    }
  },
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('deviceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDevices', () => {
    it('fetches devices from /device endpoint', async () => {
      const devices = [{ id: 1, name: 'Plug 1' }];
      mockedApiRequest.mockResolvedValue({ devices });

      const result = await deviceService.getDevices('token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/device', 'GET', undefined, 'token123');
      expect(result).toEqual(devices);
    });

    it('returns empty array when response has no devices key', async () => {
      mockedApiRequest.mockResolvedValue({});

      const result = await deviceService.getDevices('token123');

      expect(result).toEqual([]);
    });
  });

  describe('getDevice', () => {
    it('fetches single device from /device/:id', async () => {
      const device = { id: 1, name: 'Plug 1' };
      mockedApiRequest.mockResolvedValue({ device });

      const result = await deviceService.getDevice(1, 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/device/1', 'GET', undefined, 'token123');
      expect(result).toEqual(device);
    });

    it('returns raw response when device key is missing', async () => {
      const device = { id: 1, name: 'Plug 1' };
      mockedApiRequest.mockResolvedValue(device);

      const result = await deviceService.getDevice(1, 'token123');

      expect(result).toEqual(device);
    });
  });

  describe('getDeviceTelemetry', () => {
    it('fetches telemetry without limit param', async () => {
      const telemetry = [{ power: 100 }];
      mockedApiRequest.mockResolvedValue({ data: telemetry });

      const result = await deviceService.getDeviceTelemetry('dev1', 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/telemetry/dev1', 'GET', undefined, 'token123');
      expect(result).toEqual(telemetry);
    });

    it('appends limit query param when provided', async () => {
      mockedApiRequest.mockResolvedValue({ data: [] });

      await deviceService.getDeviceTelemetry('dev1', 'token123', { limit: 10 });

      expect(mockedApiRequest).toHaveBeenCalledWith('/telemetry/dev1?limit=10', 'GET', undefined, 'token123');
    });

    it('returns empty array when response has no data or telemetry key', async () => {
      mockedApiRequest.mockResolvedValue({});

      const result = await deviceService.getDeviceTelemetry('dev1', 'token123');

      expect(result).toEqual([]);
    });
  });

  describe('getLatestTelemetry', () => {
    it('fetches latest telemetry for a device', async () => {
      const telemetry = { deviceId: 'dev1', power: 100 };
      mockedApiRequest.mockResolvedValue({ data: telemetry });

      const result = await deviceService.getLatestTelemetry('dev1', 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/telemetry/dev1/latest', 'GET', undefined, 'token123');
      expect(result).toEqual(telemetry);
    });

    it('returns null when no telemetry exists', async () => {
      const { ApiError } = require('../../utils/api');
      mockedApiRequest.mockRejectedValue(new ApiError('Not found', 404));

      const result = await deviceService.getLatestTelemetry('dev1', 'token123');

      expect(result).toBeNull();
    });

    it('propagates transport errors', async () => {
      mockedApiRequest.mockRejectedValue(new Error('Network error'));

      await expect(deviceService.getLatestTelemetry('dev1', 'token123'))
        .rejects.toThrow('Network error');
    });
  });

  describe('controlDevice', () => {
    it('sends control command to device', async () => {
      mockedApiRequest.mockResolvedValue({ success: true });

      const result = await deviceService.controlDevice(1, 'turnOn', 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/device/1/control', 'POST', { action: 'turnOn' }, 'token123');
      expect(result).toEqual({ success: true });
    });

    it('sends turnOff action', async () => {
      mockedApiRequest.mockResolvedValue({ success: true });

      await deviceService.controlDevice('dev1', 'turnOff', 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/device/dev1/control', 'POST', { action: 'turnOff' }, 'token123');
    });
  });

  describe('getRooms', () => {
    it('fetches and normalizes rooms with roomId', async () => {
      mockedApiRequest.mockResolvedValue({
        rooms: [{ roomId: 1, name: 'Living Room', icon: 'home' }],
      });

      const result = await deviceService.getRooms('token123');

      expect(result).toEqual([{ roomId: 1, name: 'Living Room', icon: 'home' }]);
    });

    it('normalizes rooms with id instead of roomId', async () => {
      mockedApiRequest.mockResolvedValue({
        rooms: [{ id: 2, name: 'Bedroom' }],
      });

      const result = await deviceService.getRooms('token123');

      expect(result).toEqual([{ roomId: 2, name: 'Bedroom', icon: undefined }]);
    });

    it('propagates errors', async () => {
      mockedApiRequest.mockRejectedValue(new Error('fail'));

      await expect(deviceService.getRooms('token123')).rejects.toThrow('fail');
    });
  });

  describe('createRoom', () => {
    it('creates a room and normalizes response', async () => {
      mockedApiRequest.mockResolvedValue({ room: { roomId: 3, name: 'Kitchen', icon: 'chef' } });

      const result = await deviceService.createRoom({ name: 'Kitchen', icon: 'chef' }, 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/rooms', 'POST', { name: 'Kitchen', icon: 'chef' }, 'token123');
      expect(result).toEqual({ roomId: 3, name: 'Kitchen', icon: 'chef' });
    });

    it('normalizes response with id instead of roomId', async () => {
      mockedApiRequest.mockResolvedValue({ id: 4, name: 'Office' });

      const result = await deviceService.createRoom({ name: 'Office' }, 'token123');

      expect(result).toEqual({ roomId: 4, name: 'Office', icon: undefined });
    });
  });

  describe('deleteDevice', () => {
    it('deletes a device', async () => {
      mockedApiRequest.mockResolvedValue({ success: true });

      const result = await deviceService.deleteDevice(1, 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/device/1', 'DELETE', undefined, 'token123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getPowerUsage', () => {
    it('fetches power usage stats', async () => {
      const stats = { currentPower: 100, todayUsage: 5 };
      mockedApiRequest.mockResolvedValue(stats);

      const result = await deviceService.getPowerUsage('token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/power-usage/total', 'GET', undefined, 'token123');
      expect(result).toEqual(stats);
    });
  });

  describe('getWeeklyPowerUsage', () => {
    it('fetches weekly power usage', async () => {
      const data = { totalUsage: 50, dailyData: [1, 2, 3], labels: ['Mon', 'Tue', 'Wed'] };
      mockedApiRequest.mockResolvedValue(data);

      const result = await deviceService.getWeeklyPowerUsage('token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/power-usage/weekly', 'GET', undefined, 'token123');
      expect(result).toEqual(data);
    });
  });

  describe('getDailyPowerUsage', () => {
    it('fetches daily power usage', async () => {
      const data = { date: '2024-01-01', hourlyData: [], peakHour: 14, peakPower: 200 };
      mockedApiRequest.mockResolvedValue(data);

      const result = await deviceService.getDailyPowerUsage('token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/power-usage/daily', 'GET', undefined, 'token123');
      expect(result).toEqual(data);
    });
  });

  describe('getDevicePowerHistory', () => {
    it('fetches device power history with default period', async () => {
      mockedApiRequest.mockResolvedValue({ labels: [], data: [], unit: 'Wh' });

      await deviceService.getDevicePowerHistory('dev1', 'token123');

      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/power-usage/device/dev1?period=week', 'GET', undefined, 'token123'
      );
    });

    it('fetches device power history with custom period', async () => {
      mockedApiRequest.mockResolvedValue({ labels: [], data: [], unit: 'Wh' });

      await deviceService.getDevicePowerHistory('dev1', 'token123', 'month');

      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/power-usage/device/dev1?period=month', 'GET', undefined, 'token123'
      );
    });
  });

  describe('getPowerUsageByRoom', () => {
    it('fetches power usage by room', async () => {
      const data = { rooms: [], totalRooms: 0 };
      mockedApiRequest.mockResolvedValue(data);

      const result = await deviceService.getPowerUsageByRoom('token123');

      expect(mockedApiRequest).toHaveBeenCalledWith('/power-usage/by-room', 'GET', undefined, 'token123');
      expect(result).toEqual(data);
    });
  });
});
