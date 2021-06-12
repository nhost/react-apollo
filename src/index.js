import React from "react";
import {
  ApolloProvider,
  ApolloClient,
  createHttpLink,
  split,
  InMemoryCache,
  from,
} from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { setContext } from "@apollo/client/link/context";

export function generateApolloClient({
  auth,
  gqlEndpoint,
  headers,
  publicRole = "public",
  cache,
  connectToDevTools = false,
}) {
  const getheaders = (auth) => {
    // add headers
    const resHeaders = {
      ...headers,
    };

    // add auth headers if signed in
    // or add 'public' role if not signed in
    if (auth) {
      if (auth.isAuthenticated()) {
        resHeaders.authorization = `Bearer ${auth.getJWTToken()}`;
      } else {
        resHeaders.role = publicRole;
      }
    }

    return resHeaders;
  };

  const ssr = typeof window === "undefined";
  const uri = gqlEndpoint;

  const wsUri = uri.startsWith("https")
    ? uri.replace(/^https/, "wss")
    : uri.replace(/^http/, "ws");

  const wsLink = !ssr
    ? new WebSocketLink({
        uri: wsUri,
        options: {
          reconnect: true,
          lazy: true,
          connectionParams: () => {
            const connectionHeaders = getheaders(auth);
            return {
              headers: connectionHeaders,
            };
          },
        },
      })
    : null;

  const httplink = createHttpLink({
    uri,
  });

  const authLink = setContext((a, { headers }) => {
    return {
      headers: {
        ...headers,
        ...getheaders(auth),
      },
    };
  });

  const link = !ssr
    ? split(
        ({ query }) => {
          const { kind, operation } = getMainDefinition(query);
          return kind === "OperationDefinition" && operation === "subscription";
        },
        wsLink,
        authLink.concat(httplink)
      )
    : httplink;

  const client = new ApolloClient({
    ssr: ssr,
    link: from([link]),
    cache: cache || new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
    connectToDevTools,
  });

  return { client, wsLink };
}

export class NhostApolloProvider extends React.Component {
  constructor(props) {
    super(props);

    const {
      auth,
      gqlEndpoint,
      headers,
      publicRole = "public",
      cache,
      connectToDevTools,
    } = this.props;
    const { client, wsLink } = generateApolloClient({
      auth,
      gqlEndpoint,
      headers,
      publicRole,
      cache,
      connectToDevTools,
    });
    this.client = client;
    this.wsLink = wsLink;

    // for debug
    // const ssr = typeof window === "undefined";
    // if (!ssr) {
    //   console.log(" not ssr, set up .on");
    //   this.wsLink.subscriptionClient.on("connecting", () =>
    //     console.log("connecting")
    //   );
    //   this.wsLink.subscriptionClient.on("connected", () =>
    //     console.log("connected")
    //   );
    //   this.wsLink.subscriptionClient.on("reconnecting", () =>
    //     console.log("reconnecting")
    //   );
    //   this.wsLink.subscriptionClient.on("reconnected", () =>
    //     console.log("reconnected")
    //   );
    //   this.wsLink.subscriptionClient.on("disconnected", () =>
    //     console.log("disconnected")
    //   );
    //   this.wsLink.subscriptionClient.on("error", () => console.log("error"));
    // }

    if (this.props.auth) {
      this.props.auth.onTokenChanged(() => {
        if (this.wsLink.subscriptionClient.status === 1) {
          this.wsLink.subscriptionClient.tryReconnect();
        }
      });

      this.props.auth.onAuthStateChanged((data) => {
        // reconnect ws connection with new auth headers for the logged in/out user
        if (this.wsLink.subscriptionClient.status === 1) {
          // must close first to avoid race conditions
          this.wsLink.subscriptionClient.close();
          // reconnect
          this.wsLink.subscriptionClient.tryReconnect();
        }
      });
    }
  }

  render() {
    console.log("wrap render...");
    return (
      <ApolloProvider client={this.client}>
        {this.props.children}
      </ApolloProvider>
    );
  }
}
