export function parseCommand(input: string) {
    if (!input.startsWith("/")) return null;

    const [command, ...args] = input.trim().substring(1).split(" ");
    return { command, args };
}
