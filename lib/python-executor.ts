/**
 * Serviço para executar código Python via backend
 */

import { ExecutionResult } from './types';

/**
 * Interface para requisição de execução de código
 */
interface ExecutionRequest {
  code: string;
  timeout?: number;
  args?: string[];
}

/**
 * Executa código Python no backend
 */
export async function executePythonCode(
  code: string,
  timeout: number = 5000,
  args: string[] = []
): Promise<ExecutionResult> {
  const startTime = Date.now();
  try {
    // TODO: Integrar com backend real
    // Por enquanto, retorna um resultado simulado
    const result: ExecutionResult = {
      stdout: `# Execução simulada\n# Código: ${code.substring(0, 50)}...\n`,
      stderr: '',
      exitCode: 0,
      executionTime: Date.now() - startTime,
    };

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      stdout: '',
      stderr: `Erro ao executar código: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      exitCode: 1,
      executionTime,
    };
  }
}

/**
 * Valida código Python antes de executar
 */
export function validatePythonCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificações básicas
  if (!code.trim()) {
    errors.push('Código vazio');
  }

  // Verificar imports perigosos
  const dangerousImports = ['os', 'sys', 'subprocess', 'socket', 'urllib'];
  dangerousImports.forEach(imp => {
    if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
      errors.push(`Import perigoso detectado: ${imp}`);
    }
  });

  // Verificar funções perigosas
  const dangerousFunctions = ['eval', 'exec', 'compile', '__import__'];
  dangerousFunctions.forEach(func => {
    if (code.includes(func)) {
      errors.push(`Função perigosa detectada: ${func}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Obtém sugestões de código baseadas no contexto
 */
export function getCodeSuggestions(code: string, line: number): string[] {
  const suggestions: string[] = [];
  const lines = code.split('\n');
  const currentLine = lines[line - 1] || '';

  // Sugestões para print
  if (currentLine.includes('print')) {
    suggestions.push('print("Hello, World!")');
    suggestions.push('print(f"Variável: {var}"');
  }

  // Sugestões para loops
  if (currentLine.includes('for ')) {
    suggestions.push('for i in range(10):');
    suggestions.push('for item in list:');
  }

  // Sugestões para funções
  if (currentLine.includes('def ')) {
    suggestions.push('def function_name():');
    suggestions.push('def function_name(param1, param2):');
  }

  // Sugestões para classes
  if (currentLine.includes('class ')) {
    suggestions.push('class ClassName:');
    suggestions.push('class ClassName(BaseClass):');
  }

  return suggestions;
}

/**
 * Formata output de execução para exibição
 */
export function formatExecutionOutput(result: ExecutionResult): string {
  let output = '';

  if (result.stdout) {
    output += `STDOUT:\n${result.stdout}\n`;
  }

  if (result.stderr) {
    output += `STDERR:\n${result.stderr}\n`;
  }

  output += `\nCódigo de saída: ${result.exitCode}`;
  output += `\nTempo de execução: ${result.executionTime}ms`;

  return output;
}

/**
 * Extrai informações de erro do output
 */
export function parseExecutionError(stderr: string): { line?: number; message: string } {
  // Padrão: "File "script.py", line X, in <module>"
  const lineMatch = stderr.match(/line (\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

  // Extrair mensagem de erro
  const lines = stderr.split('\n');
  const message = lines[lines.length - 2] || stderr;

  return { line, message };
}

/**
 * Gera template de código Python para diferentes casos de uso
 */
export function generatePythonTemplate(type: 'hello' | 'loop' | 'function' | 'class'): string {
  const templates: Record<string, string> = {
    hello: `# Hello World
print("Hello, World!")
`,
    loop: `# Loop Example
for i in range(5):
    print(f"Iteration {i}")
`,
    function: `# Function Example
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`,
    class: `# Class Example
class Person:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return f"Hello, I'm {self.name}"

person = Person("Alice")
print(person.greet())
`,
  };

  return templates[type] || '';
}
