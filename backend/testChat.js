import dotenv from 'dotenv';
dotenv.config();

import { createOrGetSession, sendMessage } from './controllers/chatController.js';

const mockUser = {
  uid: 'mock_uid_123',
  name: 'Zeeshan Tahir',
  location: 'UAE',
  healthGoals: 'Weight loss',
  age: 25,
  weight: 80,
  height: 180,
  restrictions: [],
  pantry: ['Oatmeal', 'Milk', 'Eggs', 'Banana']
};

const run = async () => {
  console.log('1. Provisions a chat session (createOrGetSession)...');
  
  let sessionId = null;
  const mockCreateReq = {
    user: mockUser,
    body: {}
  };
  
  const mockCreateRes = {
    status: () => mockCreateRes,
    json: (data) => {
      sessionId = data._id;
      console.log('   Session provisioned with ID:', sessionId);
      return mockCreateRes;
    }
  };
  
  await createOrGetSession(mockCreateReq, mockCreateRes);
  
  if (!sessionId) {
    console.error('Failed to create session, aborting.');
    return;
  }
  
  console.log('\n2. Sending user message to the active session...');
  
  const mockMsgReq = {
    user: mockUser,
    body: {
      sessionId,
      role: 'user',
      content: 'I just ate two eggs and a banana for breakfast'
    }
  };
  
  let loggedData = null;
  const mockMsgRes = {
    status: (code) => {
      console.log('   sendMessage status code:', code);
      return mockMsgRes;
    },
    json: (data) => {
      loggedData = data;
      return mockMsgRes;
    }
  };
  
  await sendMessage(mockMsgReq, mockMsgRes);
  
  console.log('\n--- DIAGNOSTICS COMPLETE ---');
  if (loggedData) {
    console.log('Role:', loggedData.role);
    console.log('Content:', loggedData.content);
    console.log('ToolCalls:', JSON.stringify(loggedData.toolCalls || [], null, 2));
  } else {
    console.log('No message data returned.');
  }
};

run();
