// API utility for backend communication
export const API_BASE_URL = "http://192.168.1.57:3000/api"; // Use same IP as Expo server

export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  token?: string
) {
  const headers: any = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  console.log(`Making request to: ${API_BASE_URL}${endpoint}`); // Debug log
  
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`Response status: ${res.status}`); // Debug log
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error: ${errorText}`);
      throw new Error(errorText);
    }
    return res.json();
  } catch (error) {
    console.error(`API Request failed: ${error}`);
    throw error;
  }
}

