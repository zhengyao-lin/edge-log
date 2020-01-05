import React, { Component, FunctionComponent } from "react";
import ReactDOM from "react-dom";

import { BrowserRouter, Switch, Route } from "react-router-dom";

import "semantic-ui-css/semantic.min.css";
import { MainPage } from "./pages/main";
import { Container } from "semantic-ui-react";
import { Padding } from "./components/padding";

const Header: FunctionComponent = () => <div />;
const Footer: FunctionComponent = () => <Padding size="large" />;

class App extends Component {
    render() {
        return (
            <Container>
                <Header />
                <BrowserRouter>
                    <Switch>
                        <Route>
                            <MainPage />
                        </Route>
                    </Switch>
                </BrowserRouter>
                <Footer />
            </Container>
        );
    }
}

ReactDOM.render(<App />, document.body);
