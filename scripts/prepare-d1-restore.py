"""Order a D1 export so all referenced tables exist before records are imported."""

import argparse
import os
import re
import sqlite3
from pathlib import Path


def prepare(source, destination):
    statements = []
    pending = ""
    for char in source.read_text():
        pending += char
        if char == ";" and sqlite3.complete_statement(pending):
            statements.append(pending.strip())
            pending = ""
    if pending.strip():
        raise ValueError("Export ends with an incomplete SQL statement.")
    tables, data, constraints = [], [], []
    for statement in statements:
        normalized = statement.upper()
        if normalized.startswith("PRAGMA DEFER_FOREIGN_KEYS="):
            continue
        if normalized.startswith("CREATE TABLE "):
            tables.append(statement)
        elif normalized.startswith(("INSERT INTO ", "DELETE FROM SQLITE_SEQUENCE")):
            data.append(statement)
        elif normalized.startswith(("CREATE INDEX ", "CREATE UNIQUE INDEX ", "CREATE TRIGGER ")):
            constraints.append(statement)
        else:
            raise ValueError("Export contains an unsupported SQL statement.")
    if not tables:
        raise ValueError("Export contains no tables.")
    with sqlite3.connect(":memory:") as db:
        db.executescript("\n".join(tables))
        names = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
        dependencies = {
            table: {fk[2] for fk in db.execute('PRAGMA foreign_key_list("' + table.replace('"', '""') + '")') if fk[2] != table}
            for table in names
        }
        order = []
        while dependencies:
            ready = sorted(table for table, parents in dependencies.items() if not parents.intersection(dependencies))
            if not ready:
                raise ValueError("Table dependencies contain a cycle. This restore requires manual review.")
            order.extend(ready)
            for table in ready:
                del dependencies[table]
        ranks = {table: index for index, table in enumerate(order)}
        inserts = []
        sequence = []
        for statement in data:
            match = re.match(r'INSERT INTO\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|(\w+))', statement, re.IGNORECASE)
            if match:
                table = next(value for value in match.groups() if value is not None)
                if table == "sqlite_sequence":
                    sequence.append(statement)
                else:
                    inserts.append((ranks[table], statement))
            else:
                sequence.append(statement)
        ordered_data = [statement for _, statement in sorted(inserts, key=lambda item: item[0])] + sequence
    sql = "PRAGMA defer_foreign_keys=TRUE;\n" + "\n".join(tables + ordered_data + constraints) + "\n"
    with sqlite3.connect(":memory:") as db:
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript("BEGIN;\n" + sql + "COMMIT;")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Prepared restore violates foreign keys.")
    with os.fdopen(os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as output:
        output.write(sql)
    return len(tables)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        print(f"Prepared restore with {prepare(args.source, args.destination)} tables before data.")
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(1, f"Restore preparation failed. {error}\n")
