import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const database = db.read();
    if (userId) {
      const user = database.users.find(u => u.id === userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const { password, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    // Default to the first admin if no userId passed, or list safe users
    const safeUsers = database.users.map(({ password, ...u }) => u);
    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    const database = db.read();

    if (action === 'change_password') {
      const { userId, newPassword } = body;
      const userIndex = database.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      database.users[userIndex].password = newPassword;
      db.write(database);
      db.logAudit(userId, database.users[userIndex].fullName, 'CHANGE_PASSWORD', 'user', userId, 'Password updated successfully');
      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    // Login action
    const user = database.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 401 });
    }

    if (user.password && user.password !== password) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;
    db.logAudit(user.id, user.fullName, 'LOGIN', 'auth', user.id, `User logged in as ${user.role}`);

    return NextResponse.json({
      success: true,
      user: safeUser,
      school: database.school,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
