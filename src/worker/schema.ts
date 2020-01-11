import { EdgeLog, Post } from "./models";
import {
    GraphQLSchema,
    GraphQLObjectType,
    buildSchema,
    GraphQLString,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
} from "graphql";
import { assert } from "../common";

function typeFromGQL(name: string, source: string): GraphQLObjectType {
    const type = buildSchema(source).getType(name);
    assert(type !== null && type !== undefined);
    return type as GraphQLObjectType;
}

const GraphQLPostType = typeFromGQL(
    "Post",
    `
    type Post {
        id: ID!
        title: String!
        content: String!
        timeOfCreation: Float!
        timeOfLastEdit: Float!
    }
`
);

export const apiSchema = (log: EdgeLog) =>
    new GraphQLSchema({
        query: new GraphQLObjectType({
            name: "Query",
            fields: {
                headline: {
                    type: GraphQLNonNull(GraphQLString),
                    resolve: async () => {
                        return await log.siteConfig.getHeadline();
                    },
                },

                /**
                 * Query for looking up posts
                 */
                posts: {
                    type: GraphQLNonNull(
                        GraphQLList(GraphQLNonNull(GraphQLPostType))
                    ),
                    args: {
                        id: { type: GraphQLString },
                        skip: { type: GraphQLInt, defaultValue: 0 },
                        limit: { type: GraphQLInt, defaultValue: 6 }, // TODO: magic value
                    },
                    resolve: async (root, args) => {
                        if (args.id !== undefined) {
                            // query single post
                            const post = await log.getPost(args.id);

                            if (post !== null) {
                                return [post];
                            } else {
                                return [];
                            }
                        } else {
                            // query list of posts (in the reversed order of creation)
                            const cursor = await log.listPost();

                            if (args.limit > 6) {
                                args.limit = 6;
                            }

                            return await cursor
                                .skip(args.skip)
                                .take(args.limit)
                                .getAll();
                        }
                    },
                },
            },
        }),

        /**
         * TODO: need authentication
         */
        mutation: new GraphQLObjectType({
            name: "Mutation",
            fields: {
                /**
                 * Set site headline
                 */
                setHeadline: {
                    type: GraphQLNonNull(GraphQLString),
                    args: {
                        headline: { type: GraphQLNonNull(GraphQLString) },
                    },
                    resolve: async (root, { headline }) => {
                        assert(headline.length < 16, "headline is too long");
                        await log.siteConfig.setHeadline(headline);
                        return headline;
                    },
                },

                /**
                 * Add new post
                 */
                addPost: {
                    type: GraphQLNonNull(GraphQLPostType),
                    args: {
                        title: { type: GraphQLString },
                        content: { type: GraphQLString },
                    },
                    resolve: async (root, args) => {
                        const post = new Post(args);
                        await log.addPost(post);
                        return post;
                    },
                },

                /**
                 * Update post info
                 */
                editPost: {
                    type: GraphQLPostType,
                    args: {
                        id: { type: GraphQLNonNull(GraphQLString) },
                        title: { type: GraphQLString },
                        content: { type: GraphQLString },
                    },
                    resolve: async (root, args) => {
                        const post = await log.getPost(args.id);

                        if (post === null) return null;

                        // update title/content and edit time
                        Object.assign(post, args);
                        post.timeOfLastEdit = new Date().getTime();

                        await log.editPost(post);

                        return post;
                    },
                },
            },
        }),
    });
