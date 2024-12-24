import { Message, TextChannel, Client } from "discord.js";

function createMockMessage(content: string): Message<boolean> {
  const client = new Client({ intents: [] }); // Minimal mock client
  const channel = {
    id: "mock-channel-id",
    send: async () => Promise.resolve(null),
  } as unknown as TextChannel;

  const mockMessage = {
    id: "mock-message-id",
    content,
    author: {
      id: "mock-author-id",
      username: "MockUser",
      bot: false,
    },
    channel,
    client,
    guild: null,
    delete: async () => Promise.resolve(),
    edit: async () => Promise.resolve(),
    // Add any other necessary properties/methods here
  } as unknown as Message<boolean>;

  return mockMessage;
}

// Example usage
const mockMessage = createMockMessage("Hello, world!");
console.log(mockMessage.content); // "Hello, world!"

export default createMockMessage;
