import { IndentAction, LanguageConfiguration } from 'vscode';

function verboseRegExp(pattern: string, flags?: string): RegExp {
	pattern = pattern.replace(/(^| {2})# .*$/gm, '');
	pattern = pattern.replace(/\s+?/g, '');
	return RegExp(pattern, flags);
}

export function getIndentDedentConfiguration(): LanguageConfiguration {
    return {
        onEnterRules: [
            // multi-line separator
            {
                beforeText: verboseRegExp(`
                    ^
                    (?! \\s+ \\\\ )
                    [^#\n]+
                    \\\\
                    $
                `),
                action: {
                    indentAction: IndentAction.Indent,
                },
            },
            // continue comments
            {
                beforeText: /^\s*#.*/,
                afterText: /.+$/,
                action: {
                    indentAction: IndentAction.None,
                    appendText: '# ',
                },
            },
            // indent on enter (block-beginning statements)
            {
                /**
                 * This does not handle all cases. However, it does handle nearly all usage.
                 * Here's what it does not cover:
                 * - the statement is split over multiple lines (and hence the ":" is on a different line)
                 * - the code block is inlined (after the ":")
                 * - there are multiple statements on the line (separated by semicolons)
                 * Also note that `lambda` is purposefully excluded.
                 */
                beforeText: verboseRegExp(`
                    ^
                    \\s*
                    (?:
                        (?:
                            (?:
                                class |
                                enum |
                                def |
                                for |
                                if |
                                while |
                            )
                            \\b .*
                        ) |
                        else |
                        try |
                        finally
                    )
                    \\s*
                    (?: [#] .* )?
                    $
                `),
                action: {
                    indentAction: IndentAction.Indent,
                },
            },
            // outdent on enter (block-ending statements)
            {
                /**
                 * This does not handle all cases. Notable omissions here are
                 * "return" and "raise" which are complicated by the need to
                 * only outdent when the cursor is at the end of an expression
                 * rather than, say, between the parentheses of a tail-call or
                 * exception construction. (see issue #10583)
                 */
                beforeText: verboseRegExp(`
                    ^
                    (?:
                        (?:
                            \\s+
                            (?:
                                break |
                                return |
                                continue
                            )
                        )
                    )
                    \\s*
                    (?: [#] .* )?
                    $
                `),
                action: {
                    indentAction: IndentAction.Outdent,
                },
            },
            // Note that we do not currently have an auto-dedent
            // solution for "else", "except", and "finally".
            // We had one but had to remove it (see issue #6886).
        ],
    };
}