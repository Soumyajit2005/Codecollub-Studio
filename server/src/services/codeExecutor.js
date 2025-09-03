import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const executeCode = async (code, language) => {
  const tempDir = path.join(__dirname, '../../temp');
  const fileId = uuidv4();
  
  try {
    await fs.mkdir(tempDir, { recursive: true });

    let fileName, command, args;
    
    switch (language) {
      case 'javascript':
        fileName = `${fileId}.js`;
        command = 'node';
        args = [fileName];
        break;
      
      case 'python':
        fileName = `${fileId}.py`;
        command = 'python3';
        args = [fileName];
        break;
      
      case 'cpp':
        fileName = `${fileId}.cpp`;
        const outputFile = `${fileId}.out`;
        // Compile first
        await new Promise((resolve, reject) => {
          const compile = spawn('g++', [fileName, '-o', outputFile], {
            cwd: tempDir
          });
          compile.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error('Compilation failed'));
          });
        });
        command = `./${outputFile}`;
        args = [];
        break;
      
      case 'csharp':
        fileName = `${fileId}.cs`;
        command = 'dotnet';
        args = ['script', fileName];
        break;
      
      default:
        throw new Error('Unsupported language');
    }

    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, code);

    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: tempDir,
        timeout: 5000 // 5 second timeout
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', async (code) => {
        // Clean up
        try {
          await fs.unlink(filePath);
          if (language === 'cpp') {
            await fs.unlink(path.join(tempDir, `${fileId}.out`));
          }
        } catch (err) {
          console.error('Cleanup error:', err);
        }

        resolve({
          success: code === 0,
          output: output || error,
          exitCode: code
        });
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Execution error:', error);
    throw error;
  }
};

export { executeCode };