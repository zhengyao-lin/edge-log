import {
    h,
    FunctionalComponent,
    VNode,
    ComponentType,
    RenderableProps,
    Fragment,
} from "preact";
import { JSXInternal } from "preact/src/jsx";

export const Div: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLDivElement
>> = props => <div {...props}>{props.children}</div>;

export const Paragraph: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLParagraphElement
>> = props => <div {...props}>{props.children}</div>;

export const Anchor: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLAnchorElement
>> = props => <a {...props}>{props.children}</a>;

export const Span: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLSpanElement
>> = props => <span {...props}>{props.children}</span>;

export const Heading1: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h1 {...props}>{props.children}</h1>;

export const Heading2: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h2 {...props}>{props.children}</h2>;

export const Heading3: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h3 {...props}>{props.children}</h3>;

export const Heading4: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h4 {...props}>{props.children}</h4>;

export const Heading5: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h5 {...props}>{props.children}</h5>;

export const Heading6: FunctionalComponent<JSXInternal.HTMLAttributes<
    HTMLHeadingElement
>> = props => <h6 {...props}>{props.children}</h6>;

/**
 * A mutually exclusive intersection of three records:
 * { as: ... } & P & E
 */
export type BaseProps<P, E = {}> = {
    as: ComponentType<P>;
} & {
    [K in Exclude<keyof E, "as">]?: E[K];
} &
    {
        [K in Exclude<keyof P, "as" | keyof E>]?: P[K];
    };

export type InternalProperty<
    K extends keyof JSXInternal.HTMLAttributes<HTMLElement>
> = { [P in K]: JSXInternal.HTMLAttributes<HTMLElement>[P] };

export function Base<P>(props: RenderableProps<BaseProps<P>>): VNode {
    const Child = props.as as ComponentType<any>;
    return <Child {...props}>{props.children}</Child>;
}
