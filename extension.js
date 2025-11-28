const vscode = require('vscode');

function activate(context) {
    console.log('Extension "codify" is now active!');

    let disposable = vscode.commands.registerCommand('codify.helloWorld', function () {
        vscode.window.showInformationMessage('Hello from Codify!');
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};