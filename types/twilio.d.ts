declare module 'twilio' {
  interface MessageCreateOptions {
    body: string;
    from: string;
    to: string;
  }

  interface TwilioClient {
    messages: {
      create(options: MessageCreateOptions): Promise<unknown>;
    };
  }

  export default function twilio(accountSid?: string, authToken?: string): TwilioClient;
}
