import { FastifyRequest, FastifyReply } from "fastify";
import { calculatorParameterSchema, calculateCostSchema } from "./calculator.types";
import { CalculatorService } from "./calculator.service";

export class CalculatorController {
    
    static async updateParametersHandler(request: FastifyRequest, reply: FastifyReply) {
        const data = calculatorParameterSchema.parse(request.body);
        const updated = await CalculatorService.updateParameters(data);
        
        return reply.status(200).send({
        message: "Parâmetros configurados e salvos com sucesso!",
        data: updated,
        });
    }

    static async getParametersHandler(request: FastifyRequest, reply: FastifyReply) {
    const parameters = await CalculatorService.getParameters();
    return reply.status(200).send(parameters);
  }

    static async calculateHandler(request: FastifyRequest, reply: FastifyReply) {
        const data = calculateCostSchema.parse(request.body);
        const result = await CalculatorService.calculate(data);
        return reply.status(200).send(result);
    }
}