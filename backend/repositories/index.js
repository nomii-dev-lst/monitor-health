/**
 * Central export for all repositories
 */

export { UserRepository } from './UserRepository.js';
export { MonitorRepository } from './MonitorRepository.js';
export { CheckResultRepository } from './CheckResultRepository.js';
export { AlertRepository } from './AlertRepository.js';
export { SettingsRepository } from './SettingsRepository.js';

// Default export as object for easier importing
export default {
  UserRepository: (await import('./UserRepository.js')).UserRepository,
  MonitorRepository: (await import('./MonitorRepository.js')).MonitorRepository,
  CheckResultRepository: (await import('./CheckResultRepository.js')).CheckResultRepository,
  AlertRepository: (await import('./AlertRepository.js')).AlertRepository,
  SettingsRepository: (await import('./SettingsRepository.js')).SettingsRepository
};
