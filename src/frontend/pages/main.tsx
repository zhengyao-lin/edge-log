import "preact/debug";
import { h, render, FunctionalComponent, Fragment } from "preact";

import { Header } from "../components/header";

import {
    GraphQLClient,
    GraphQLProvider,
    useQuery,
} from "../components/graphql";
import { Div, Heading1, Paragraph } from "../components/base";
import { Container } from "../components/container";
import { assert } from "../../common";
import { Divider } from "../components/divider";

const client = new GraphQLClient("https://edge-blog.net.workers.dev/api");

type PostProps = {
    id: string;
    title: string;
    content: string;
    timeOfCreation: number;
};

const Post: FunctionalComponent<PostProps> = props => {
    return (
        <Div>
            <Header>
                {props.title}: {props.timeOfCreation}
            </Header>
            <Paragraph>{props.content}</Paragraph>
        </Div>
    );
};

const PostList: FunctionalComponent = props => {
    const [loading, error, data] = useQuery<{
        headline: string;
        posts: PostProps[];
    }>(`
        query {
            headline
            posts {
                id
                title
                content
                timeOfCreation
            }
        }
    `);

    if (loading) {
        return <Div>Loading</Div>;
    }

    if (error !== null) {
        return <Div>error: {JSON.stringify(error)}</Div>;
    }

    assert(data !== null);

    return (
        <Div>
            <Header size="height-huge">{data.headline}</Header>
            {data.posts.map(post => (
                <Fragment>
                    <Divider size="gap-big"></Divider>
                    <Post {...post}></Post>
                </Fragment>
            ))}
        </Div>
    );
};

const Entry: FunctionalComponent = props => {
    return (
        <GraphQLProvider value={client}>
            <Container style={{ padding: "1.5em", "font-family": "monospace" }}>
                <PostList />
            </Container>
        </GraphQLProvider>
    );
};

render(<Entry />, document.body);
