from db import get_db

def query_db(sql, args=(), one=False, commit=False):
    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)  # buffered=True fixes unread result
    cursor.execute(sql, args)

    if commit:
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return last_id

    result = cursor.fetchone() if one else cursor.fetchall()
    cursor.close()
    conn.close()
    return result