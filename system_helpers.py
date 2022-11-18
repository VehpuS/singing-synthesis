import subprocess
import sys

def run_os_cmd(
    cmd: str,  # Command to run
    interactive_write: bool=True,  # Should the command print as it's running
):
    print(f"Running '{cmd}'")
    cmd_proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True )
    
    if interactive_write:
        for c in iter(lambda: cmd_proc.stderr.read(1), b""):
            try:
                sys.stdout.buffer.write(c)
            except:
                sys.stdout.write(c)
        for c in iter(lambda: cmd_proc.stdout.read(1), b""):
            try:
                sys.stdout.buffer.write(c)
            except:
                sys.stdout.write(c)

    output, errors = cmd_proc.communicate()

    if not interactive_write:
        print(str(output.decode()))

    if cmd_proc.returncode:
        print(f"RUN failed\n\n{errors.decode()}\n\n")
    elif errors and not interactive_write:
        print(str(errors.decode()))
