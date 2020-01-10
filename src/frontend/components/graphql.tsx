import { createContext } from "preact";
import { useState, useContext, useMemo, useEffect } from "preact/hooks";

export type GraphQLQuery = string;

export type GraphQLError = {
    message: string;
    locations?: { line: number; column: number }[];
    path?: (string | number)[];
};

export type GraphQLResult<T> =
    | {
          data: T;
      }
    | {
          data?: T;
          errors: GraphQLError[];
      };

export class GraphQLClient {
    constructor(private endpoint: string) {}

    /**
     * Returns null if fetch failed, response has
     * non-200 status code, or the response does not
     * have a valid JSON syntax
     */
    async query<T>(query: GraphQLQuery): Promise<GraphQLResult<T>> {
        try {
            const response = await fetch(this.endpoint, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ query }),
            });

            if (response.status !== 200) {
                // throw new Error(`fetching ${this.endpoint} for query "${query}" failed with status ${response.status}`);
                return {
                    errors: [
                        {
                            message: `fetching ${this.endpoint} for query "${query}" failed with status ${response.status}`,
                        },
                    ],
                };
            }

            return (await response.json()) as GraphQLResult<T>;
        } catch (e) {
            return {
                errors: [
                    {
                        message: `failed to fetch query result: ${e}`,
                    },
                ],
            };
        }
    }
}

const GraphQLContext = createContext<GraphQLClient | null>(null);

export const GraphQLProvider = GraphQLContext.Provider;
export const GraphQLConsumer = GraphQLContext.Consumer;

type UseQueryState<T> = [boolean, GraphQLError[] | null, T | null];

export function useQuery<T>(query: GraphQLQuery): UseQueryState<T> {
    const client = useContext(GraphQLContext);

    // this is likely a programming error so throwing an exception
    if (client === null) {
        throw new Error("useQuery can only be used in a graph provider");
    }

    const [state, setState] = useState<UseQueryState<T>>([true, null, null]);

    useEffect(() => {
        client.query<T>(query).then(result => {
            if ("errors" in result) {
                setState([false, result.errors, result.data || null]);
            } else {
                setState([false, null, result.data]);
            }
        });
    }, [client]);

    return state;
}
