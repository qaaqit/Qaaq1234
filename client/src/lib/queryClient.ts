import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  // Only add auth headers if token exists (optional authentication)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`Using auth token:`, token.substring(0, 50) + '...');
  } else {
    console.log(`No auth token - proceeding without authentication`);
  }
  
  return headers;
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // COMPLETELY DISABLED FOR STABILITY TESTING - prevent ALL requests
    console.log('🚫 React Query BLOCKED request to:', queryKey.join("/"));
    throw new Error('React Query temporarily disabled for console stability');
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      enabled: false, // COMPLETELY DISABLED React Query for stability testing
    },
    mutations: {
      retry: false,
    },
  },
});
