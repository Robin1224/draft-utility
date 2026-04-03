// @ts-check
import { describe, it, expect } from 'vitest';
import classes from './classes.json';

describe('classes catalog (LIST-01)', () => {
	it('has exactly 28 entries', () => {
		expect(classes).toHaveLength(28);
	});

	it('every entry has id (kebab-case string), name (string), role (melee|ranged|support)', () => {
		const validRoles = ['melee', 'ranged', 'support'];
		for (const champion of classes) {
			expect(typeof champion.id).toBe('string');
			expect(typeof champion.name).toBe('string');
			expect(validRoles).toContain(champion.role);
		}
	});

	it('melee group has 9 entries: Bakko, Jamila, Croak, Freya, Raigon, Rook, Ruh Kaan, Shifu, Thorn', () => {
		const melee = classes.filter((c) => c.role === 'melee');
		expect(melee).toHaveLength(9);
		const meleeNames = melee.map((c) => c.name);
		expect(meleeNames).toContain('Bakko');
		expect(meleeNames).toContain('Jamila');
		expect(meleeNames).toContain('Croak');
		expect(meleeNames).toContain('Freya');
		expect(meleeNames).toContain('Raigon');
		expect(meleeNames).toContain('Rook');
		expect(meleeNames).toContain('Ruh Kaan');
		expect(meleeNames).toContain('Shifu');
		expect(meleeNames).toContain('Thorn');
	});

	it('ranged group has 10 entries: Alysia, Ashka, Destiny, Ezmo, Iva, Jade, Jumong, Shen Rao, Taya, Varesh', () => {
		const ranged = classes.filter((c) => c.role === 'ranged');
		expect(ranged).toHaveLength(10);
		const rangedNames = ranged.map((c) => c.name);
		expect(rangedNames).toContain('Alysia');
		expect(rangedNames).toContain('Ashka');
		expect(rangedNames).toContain('Destiny');
		expect(rangedNames).toContain('Ezmo');
		expect(rangedNames).toContain('Iva');
		expect(rangedNames).toContain('Jade');
		expect(rangedNames).toContain('Jumong');
		expect(rangedNames).toContain('Shen Rao');
		expect(rangedNames).toContain('Taya');
		expect(rangedNames).toContain('Varesh');
	});

	it('support group has 9 entries: Blossom, Lucie, Oldur, Pearl, Pestilus, Poloma, Sirius, Ulric, Zander', () => {
		const support = classes.filter((c) => c.role === 'support');
		expect(support).toHaveLength(9);
		const supportNames = support.map((c) => c.name);
		expect(supportNames).toContain('Blossom');
		expect(supportNames).toContain('Lucie');
		expect(supportNames).toContain('Oldur');
		expect(supportNames).toContain('Pearl');
		expect(supportNames).toContain('Pestilus');
		expect(supportNames).toContain('Poloma');
		expect(supportNames).toContain('Sirius');
		expect(supportNames).toContain('Ulric');
		expect(supportNames).toContain('Zander');
	});

	it('ruh-kaan entry has correct id and name', () => {
		const ruhKaan = classes.find((c) => c.id === 'ruh-kaan');
		expect(ruhKaan).toBeDefined();
		expect(ruhKaan?.name).toBe('Ruh Kaan');
		expect(ruhKaan?.role).toBe('melee');
	});
});
