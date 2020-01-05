import React, { Component } from "react";
import { Header, Container } from "semantic-ui-react";

import { Divider } from "../components/divider";
import { Padding } from "../components/padding";
import { Link } from "react-router-dom";

type PostItemProps = {
    id?: string | null;
    title?: string;
    content?: string;
    timeOfCreation?: number;
    maxWordCount?: number;
};

class PostGist extends Component<PostItemProps> {
    static defaultProps = {
        id: null,
        title: "(untitled)",
        content: "(no content)",
        timeOfCreation: 0,
        maxWordCount: 72,
    };

    static trimWord(text: string, count: number): string {
        return text
            .split(" ")
            .slice(0, count)
            .join(" ");
    }

    render() {
        let linkProps = {};

        if (this.props.id !== null) {
            linkProps = {
                as: Link,
                to: `/post/${this.props.id}`,
            };
        }

        return (
            <Container>
                <Header size="large" {...linkProps}>
                    {this.props.title}
                    <Header.Subheader>
                        {new Date(this.props.timeOfCreation!).toDateString()}
                    </Header.Subheader>
                </Header>
                <p style={{ color: "rgb(150, 150, 150)" }}>
                    {PostGist.trimWord(
                        this.props.content!,
                        this.props.maxWordCount!
                    ) + "..."}
                </p>
            </Container>
        );
    }
}

export class MainPage extends Component {
    render() {
        return (
            <Container>
                <Padding size="huge" />
                <Header
                    textAlign="center"
                    size="huge"
                    style={{ fontSize: "3em" }}
                >
                    Food for thought
                </Header>
                <Padding size="huge" />
                <Container text>
                    <PostGist
                        title="Hello"
                        timeOfCreation={100000}
                        content="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
                    />
                    <Divider margin="3em"></Divider>
                    <PostGist
                        title="Second Paragraph"
                        content="At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat"
                    />
                    <Divider margin="3em"></Divider>
                    <PostGist
                        title="First post"
                        content="Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"
                    />
                </Container>
            </Container>
        );
    }
}
