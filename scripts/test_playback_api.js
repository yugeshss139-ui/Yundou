// Test the cloudinary-sign-playback API endpoint
const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY2MmQ3YTBkNGVlZmQzNDMyNjFjYWRkZmZhZWM2MjNkYzZjYTlmZjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoic2FtcGxlMSIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS95dW5kby1iODNhNyIsImF1ZCI6Inl1bmRvLWI4M2E3IiwiYXV0aF90aW1lIjoxNzg5MjE4NDQxLCJ1c2VyX2lkIjoiSXFPRFRYaXQwUFBJRXg2RFNtZGlxVjAzNVJMMiIsInN1YiI6IklxT0RUWGl0MFBQSUV4NkRTbWRpcVYwMzVSTDIiLCJpYXQiOjE3ODkyMTg0NDEsImV4cCI6MTc4OTIyMjA0MSwiZW1haWwiOiJzYW1wbGUxQHl1bmRvLmFwcCIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJzYW1wbGUxQHl1bmRvLmFwcCJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.ga6wMhZHfRpGuARBaFkLKCK9trzFKGKzEC3p2cAc4RDRLZbpOrtLmq6STi13SC8FqaqW9zGEtK5YUYOYvfiEvlfHUrGlaT5mpbRN57F1gaY_QfBUOfis0dgqq_9uJlydVcOKBqQlcL9Q6IrO4HlIR7LmCtjRwHUui2QI3lvYlr6VmK8ny6Xza9HQGE9IiqXV4A7_Wwg4nDSUk9uEWDDHxv5XqH4cC3KFjFEqdbZdZO2QFn63AEcJutYKx4gSspYOKhRGCgsAxbJmVieazx6uVlAHik-3wgDI-qkIEthvhsbbLQvEmdwe7cmg_ls9rT5_K5C0Sm60LxDhJX3usDDscA';

const publicId = 'audio/166c776f-b4e6-43de-8f3c-4876b8a27f3a';

async function test() {
  const res = await fetch('http://localhost:5173/api/cloudinary-sign-playback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ publicId })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);