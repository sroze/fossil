export type AnySqsRelayCommand =
  | CreateSqsRelayCommand
  | MarkSqsQueueAsCreatedCommand;

export type CreateSqsRelayCommand = {
  type: 'CreateSqsRelay';
  data: {
    subscription_id: string;
    sqs_queue_url?: string;
  };
};

export type MarkSqsQueueAsCreatedCommand = {
  type: 'MarkSqsQueueAsCreated';
  data: {
    sqs_queue_url: string;
  };
};
