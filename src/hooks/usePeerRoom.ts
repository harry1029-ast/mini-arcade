// src/hooks/usePeerRoom.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { DataConnection } from 'peerjs';

export type PeerRole = 'HOST' | 'GUEST' | null;
export type PeerStatus = 'DISCONNECTED' | 'INITIALIZING' | 'WAITING' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export function usePeerRoom<TPacket>(onDataReceived?: (data: TPacket) => void) {
    const [role, setRole] = useState<PeerRole>(null);
    const [roomId, setRoomId] = useState<string>('');
    const [status, setStatus] = useState<PeerStatus>('DISCONNECTED');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const peerInstanceRef = useRef<any>(null);
    const connectionRef = useRef<DataConnection | null>(null);
    const dataHandlerRef = useRef(onDataReceived);
    dataHandlerRef.current = onDataReceived;

    const cleanup = useCallback(() => {
        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }
        if (peerInstanceRef.current) {
            peerInstanceRef.current.destroy();
            peerInstanceRef.current = null;
        }
        setRole(null);
        setRoomId('');
        setStatus('DISCONNECTED');
        setErrorMsg(null);
    }, []);

    const sendPacket = useCallback((packet: TPacket) => {
        if (connectionRef.current && connectionRef.current.open) {
            connectionRef.current.send(packet);
        }
    }, []);

    const createRoom = useCallback(async () => {
        cleanup();
        setStatus('INITIALIZING');
        setRole('HOST');

        try {
            const { Peer } = await import('peerjs');
            const shortId = `TRON-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const peer = new Peer(shortId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            });
            peerInstanceRef.current = peer;

            peer.on('open', (id) => {
                setRoomId(id);
                setStatus('WAITING');
            });

            peer.on('connection', (conn) => {
                connectionRef.current = conn;

                conn.on('open', () => {
                    setStatus('CONNECTED');
                });

                conn.on('data', (data: any) => {
                    try {
                        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                        if (dataHandlerRef.current) {
                            dataHandlerRef.current(parsed as TPacket);
                        }
                    } catch (e) {
                        console.error('Failed to parse peer packet:', e);
                    }
                });

                conn.on('close', () => {
                    setStatus('WAITING');
                    connectionRef.current = null;
                });

                conn.on('error', (err) => {
                    setErrorMsg(err.message);
                });
            });

            peer.on('error', (err) => {
                setErrorMsg(err.message);
                setStatus('ERROR');
            });
        } catch (e: any) {
            setErrorMsg(e?.message || 'Failed to initialize peer host');
            setStatus('ERROR');
        }
    }, [cleanup]);

    const joinRoom = useCallback(async (targetRoomId: string) => {
        if (!targetRoomId.trim()) return;
        cleanup();
        setStatus('INITIALIZING');
        setRole('GUEST');

        try {
            const { Peer } = await import('peerjs');
            const peer = new Peer({
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            });
            peerInstanceRef.current = peer;

            peer.on('open', () => {
                setStatus('CONNECTING');
                const formattedId = targetRoomId.trim().toUpperCase();

                // Set serialization explicitly to json
                const conn = peer.connect(formattedId, {
                    reliable: true,
                    serialization: 'json',
                });
                connectionRef.current = conn;

                conn.on('open', () => {
                    setRoomId(formattedId);
                    setStatus('CONNECTED');
                });

                conn.on('data', (data: any) => {
                    try {
                        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                        if (dataHandlerRef.current) {
                            dataHandlerRef.current(parsed as TPacket);
                        }
                    } catch (e) {
                        console.error('Failed to parse peer packet:', e);
                    }
                });

                conn.on('close', () => {
                    setStatus('DISCONNECTED');
                    connectionRef.current = null;
                });

                conn.on('error', (err) => {
                    setErrorMsg(err.message);
                    setStatus('ERROR');
                });
            });

            peer.on('error', (err) => {
                setErrorMsg(err.message);
                setStatus('ERROR');
            });
        } catch (e: any) {
            setErrorMsg(e?.message || 'Failed to connect to peer room');
            setStatus('ERROR');
        }
    }, [cleanup]);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        role,
        roomId,
        status,
        errorMsg,
        sendPacket,
        createRoom,
        joinRoom,
        disconnect: cleanup,
    };
}