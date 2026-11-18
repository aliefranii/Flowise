const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function validateEmail(email: unknown): string {
    if (!email || typeof email !== 'string' || email.length > 255 || !EMAIL_REGEX.test(email)) {
        throw new Error('Email tidak valid')
    }
    return email.toLowerCase().trim()
}

export function validatePassword(password: unknown): string {
    if (!password || typeof password !== 'string' || password.length > 128) {
        throw new Error('Password wajib diisi, maksimal 128 karakter')
    }
    const errors: string[] = []
    if (!/(?=.*[a-z])/.test(password)) errors.push('huruf kecil')
    if (!/(?=.*[A-Z])/.test(password)) errors.push('huruf besar')
    if (!/(?=.*\d)/.test(password)) errors.push('angka')
    if (!/(?=.*[^a-zA-Z0-9])/.test(password)) errors.push('karakter khusus')
    if (password.length < 8) errors.push('minimal 8 karakter')
    if (errors.length) throw new Error(`Password lemah: butuh ${errors.join(', ')}`)
    return password
}
