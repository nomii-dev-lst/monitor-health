/**
 * Models index - now exports repositories for PostgreSQL/Drizzle
 * This maintains backward compatibility with existing imports
 */

import { MonitorRepository } from '../repositories/MonitorRepository.js';
import { CheckResultRepository } from '../repositories/CheckResultRepository.js';
import { AlertRepository } from '../repositories/AlertRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';

// Export repositories with original model names for backward compatibility
export const Monitor = MonitorRepository;
export const CheckResult = CheckResultRepository;
export const Alert = AlertRepository;
export const User = UserRepository;
export const Settings = SettingsRepository;

// Also export as default
export default {
  Monitor: MonitorRepository,
  CheckResult: CheckResultRepository,
  Alert: AlertRepository,
  User: UserRepository,
  Settings: SettingsRepository
};
