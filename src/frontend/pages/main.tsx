import "preact/debug";
import { h, render, FunctionalComponent } from "preact";

import { Header } from "../components/header";

import {
    GraphQLClient,
    GraphQLProvider,
    useQuery,
} from "../components/graphql";
import { Div } from "../components/base";
import { Container } from "../components/container";
import { useMediaQuery } from "../components/media";

const client = new GraphQLClient("https://edge-blog.net.workers.dev/api");

const FirstPost: FunctionalComponent = props => {
    const [loading, error, data] = useQuery(`
        query {
            posts(limit: 1) {
                id
                title
                content
                timeOfCreation
                timeOfLastEdit
            }
        }
    `);

    if (loading) {
        return <div>it's loading</div>;
    }

    if (error !== null) {
        return <div>error: {JSON.stringify(error)}</div>;
    }

    return <Header as={Div}>data: {JSON.stringify(data)}</Header>;
};

const Entry: FunctionalComponent = props => {
    return (
        <GraphQLProvider value={client}>
            <Container as={Div}>
                <FirstPost />
            </Container>
        </GraphQLProvider>
    );
};

render(<Entry />, document.body);
