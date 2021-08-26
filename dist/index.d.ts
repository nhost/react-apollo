import type { ApolloClient } from "@apollo/client";
import type { WebSocketLink } from "apollo-link-ws";

export function generateApolloClient({
  auth,
  gqlEndpoint,
  headers,
  publicRole,
  cache,
  connectToDevTools,
  onError,
  defaultOptions,
}: {
  auth?: any;
  gqlEndpoint: string;
  headers?: {
    [key: string]: any;
  };
  publicRole?: string;
  cache?: any;
  connectToDevTools?: boolean;
  onError?: () => unknown;
  defaultOptions?: any;
}): {
  client: ApolloClient;
  wsLink: WebSocketLink | null;
};

export function NhostApolloProvider(
  auth: any,
  gqlEndpoint: string,
  headers?: {
    [key: string]: any;
  },
  publicRole?: string,
  cache?: any,
  connectToDevTools?: boolean,
  onError?: () => unknown,
  defaultOptions?: any,
): JSX.Element;
