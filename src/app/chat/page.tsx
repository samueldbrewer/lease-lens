import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="border-b border-gray-200 bg-white px-8 py-4">
        <h1 className="text-xl font-bold text-gray-800">Lease Assistant</h1>
        <p className="text-sm text-gray-500">
          Ask questions about your lease portfolio
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
