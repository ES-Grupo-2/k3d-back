import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/clientPrisma";

async function seed() {
    const hashAdmin = await bcrypt.hash("12345678", 10);
    const hashPeao1 = await bcrypt.hash("87654321", 10);
    const hashPeao2 = await bcrypt.hash("13572468", 10);

    await prisma.user.upsert({
        where: { email: "teste@email.com" },
        update: {},
        create: {
            name: "Admin",
            email: "teste@email.com",
            password_hash: hashAdmin,
            role: "GERENTE"
        }
    });
    await prisma.user.upsert({
        where: { email: "cleanto@email.com" },
        update: {},
        create: {
            name: "peão1",
            email: "cleanto@email.com",
            password_hash: hashPeao1,
            role: "OPERACIONAL"
        }
    });
    await prisma.user.upsert({
        where: { email: "luis@email.com" },
        update: {},
        create: {
            name: "peão2",
            email: "luis@email.com",
            password_hash: hashPeao2,
            role: "OPERACIONAL"
        }
    });

    const tagChaveiro = await prisma.tag.upsert({
        where: { type: "CHAVEIRO" },
        update: {},
        create: {
            type: "CHAVEIRO"
        }
    })

    const tagBrinde = await prisma.tag.upsert({
        where: { type: "BRINDE" },
        update: {},
        create: {
            type: "BRINDE"
        }
    })

    let client = await prisma.client.findFirst({
        where: { email: "cliente@email.com" }
    });
    if (!client) {
        client = await prisma.client.create({
            data: {
                name: "Cliente teste",
                email: "cliente@email.com",
                phone: "4002-8922"
            }
        });
    }
    const orderExistente = await prisma.order.findFirst({
        where: { title: "chaveiro do luffy", clientId: client.id }
    });

    if (!orderExistente) {
        await prisma.order.create({
            data: {
                title: "chaveiro do luffy",
                archive: "linkdoarquivo.sdfsha",
                price: 8.00,
                amount_paid: 8.00,
                tag: {
                    connect: {
                        type: tagChaveiro.type
                    }
                },
                client: {
                    connect: {
                        id: client.id
                    }
                }
            }
        });
    }
    await prisma.calculatorParameter.create({
        data: {
            filament_price: 10.00,
            kw_cost: 0.50,
            depreciation: 0.20,
            profit_margin: 0.30
        }
    });
}

seed()
    .then(() => {
        console.log("Database seeded");
        prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });