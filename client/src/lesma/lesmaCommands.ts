import OutputConsole from "../utils/OutputConsole";
import ProcessManager from "../utils/ProcessManager";
import SystemCommands from "../utils/SystemCommands";
import * as vscode from "vscode";
import { getActiveFilename } from "../utils/utils";
import Message from "../utils/Message";

/**
 * This will run the Lesma installation script.
 * If Lesma was already instead in the extension's directory
 */
export async function checkForLesma(context: vscode.ExtensionContext) {
  const installLesmaChoice = "Install Lesma";
  const dontInstallChoice = "Don't install";

  const compilerPaths = await SystemCommands.getAllPossibleLesmaCommandPaths();

  if (compilerPaths.length !== 0) {
    return;
  }

  OutputConsole.clear();
  OutputConsole.println(
    "Could not find a lesma path. Please install Lesma or report this if you believe it is an error."
  );

  const result = await vscode.window.showInformationMessage(
    "Would you like to install Lesma?",
    { modal: false },
    installLesmaChoice,
    dontInstallChoice
  );

  switch (result) {
    case installLesmaChoice:
      // Add your code to install Lesma here.
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
          title: "Installing Lesma...",
        },
        async (progress) => {
          progress.report({ increment: 0 });

          installLesma(context);

          progress.report({ increment: 100 });
        }
      );
      break;
    case dontInstallChoice:
    default:
      break;
  }
}

export async function installLesma(context: vscode.ExtensionContext) {
  const INSTALL_LESMA_SCRIPT =
    "https://raw.githubusercontent.com/alinalihassan/Lesma/main/scripts/get-lesma.sh";
  const INSTALL_LESMA_CMD = `bash -c "$(curl -fsSL ${INSTALL_LESMA_SCRIPT})" -- --non-interactive`;

  OutputConsole.clear();
  OutputConsole.println(
    `Attempting to install lesma via the official script:\n ${INSTALL_LESMA_SCRIPT}`
  );

  const terminal = vscode.window.createTerminal(`Install Lesma`);
  terminal.sendText(INSTALL_LESMA_CMD);
}

export async function executeLesma(
  context: vscode.ExtensionContext,
  filename: string,
  subcommand: "run" | "compile",
  flags?: string
) {
  const lesmaPath = await SystemCommands.getLesmaCommandPath();
  const lesmaCommand = `${lesmaPath} ${flags ?? ""} ${subcommand} ${filename}`;

  if (lesmaPath === null) {
    vscode.window.showErrorMessage(
      "Could not find a lesma path. Please install Lesma or report this if you believe it is an error."
    );
    return;
  }

  OutputConsole.clear();

  const { error, stdout, stderr, exitCode } = await ProcessManager.startCommand(
    lesmaCommand
  );

  if (error) {
    const errorMessages = [
      `Failed to ${subcommand} Lesma`,
      error.message,
      stdout,
      stderr,
    ];
    vscode.window.showErrorMessage(
      "Errors occurred while running Lesma. Please check the output console for more details."
    );
    OutputConsole.println(errorMessages.join("\n"));
    throw errorMessages.join("\n");
  }

  if (stdout) {
    OutputConsole.println(stdout);
  }
  if (stderr) {
    OutputConsole.println(stderr);
  }

  OutputConsole.println(`Process finished with exit code ${exitCode}`);
  OutputConsole.show();
}

export async function setLesmaCommands(context: vscode.ExtensionContext) {
  const installLesmaCmd = vscode.commands.registerCommand(
    "lesma.install",
    () => {
      installLesma(context);
    }
  );

  const runLesmaCommand = vscode.commands.registerCommand(
    "lesma.run",
    async (file?: any) => {
      const filename = getFilename(file);
      if (!filename) {
        Message.error("No Lesma file open.");
        return;
      }

      await executeLesma(context, filename, "run");
    }
  );

  const compileLesmaCommand = vscode.commands.registerCommand(
    "lesma.compile",
    async (file?: any) => {
      const filename = getFilename(file);
      if (!filename) {
        Message.error("No Lesma file open.");
        return;
      }

      await executeLesma(context, filename, "compile");
    }
  );

  const runLesmaWithFlagsCommand = vscode.commands.registerCommand(
    "lesma.run-with-flags",
    (file?: any) => {
      const filename = getFilename(file);
      if (!filename) {
        Message.error("No Lesma file open.");
        return;
      }
      const options: vscode.InputBoxOptions = {
        prompt: "Run Lesma with Flags",
        placeHolder: "flags (e.g. -d, -t)",
      };
      vscode.window.showInputBox(options).then(async (value) => {
        await executeLesma(context, filename, "run", value);
      });
    }
  );

  const compileLesmaWithFlagsCommand = vscode.commands.registerCommand(
    "lesma.compile-with-flags",
    (file?: any) => {
      const filename = getFilename(file);
      if (!filename) {
        Message.error("No Lesma file open.");
        return;
      }
      const options: vscode.InputBoxOptions = {
        prompt: "Compile Lesma with Flags",
        placeHolder: "flags (e.g. -d, -t)",
      };
      vscode.window.showInputBox(options).then(async (value) => {
        await executeLesma(context, filename, "compile", value);
      });
    }
  );

  context.subscriptions.push(installLesmaCmd);
  context.subscriptions.push(runLesmaCommand);
  context.subscriptions.push(runLesmaWithFlagsCommand);

  // Disabled for now. Read-only object files can't be written to while in this mode
  // context.subscriptions.push(compileLesmaCommand);
  // context.subscriptions.push(compileLesmaWithFlagsCommand);
}

function getFilename(file: any) {
  return typeof file == "string"
    ? file
    : file instanceof vscode.Uri
    ? file?.fsPath
      ? file.fsPath
      : getActiveFilename()
    : getActiveFilename();
}
