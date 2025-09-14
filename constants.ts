import { Status, SampleStatus, ProductionRequestStatus } from './types';

export const STATUS_COLORS: { [key in Status]: string } = {
  [Status.Request]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [Status.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [Status.Receiving]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  [Status.Hold]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  [Status.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  [Status.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

export const SAMPLE_STATUS_COLORS: { [key in SampleStatus]: string } = {
  [SampleStatus.Received]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [SampleStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [SampleStatus.OnHold]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  [SampleStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  [SampleStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

export const PRODUCTION_REQUEST_STATUS_COLORS: { [key in ProductionRequestStatus]: string } = {
  [ProductionRequestStatus.Requested]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [ProductionRequestStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [ProductionRequestStatus.Hold]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  [ProductionRequestStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  [ProductionRequestStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};


export const STATUS_FILTERS: Status[] = [
  Status.Request,
  Status.InProgress,
  Status.Receiving,
  Status.Hold,
  Status.Rejected,
  Status.Completed
];

export const SAMPLE_STATUS_FILTERS: SampleStatus[] = [
  SampleStatus.Received,
  SampleStatus.InProgress,
  SampleStatus.OnHold,
  SampleStatus.Rejected,
  SampleStatus.Completed,
];

export const PRODUCTION_REQUEST_STATUS_FILTERS: ProductionRequestStatus[] = [
  ProductionRequestStatus.Requested,
  ProductionRequestStatus.InProgress,
  ProductionRequestStatus.Hold,
  ProductionRequestStatus.Completed,
  ProductionRequestStatus.Rejected,
];